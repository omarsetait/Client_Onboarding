import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { EmailService } from '../communication/email.service';
import { LeadService } from '../lead/lead.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NoShowDetectionService } from './no-show-detection.service';

@Injectable()
export class CalendarService {
    private readonly logger = new Logger(CalendarService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly graphService: MicrosoftGraphService,
        private readonly emailService: EmailService,
        private readonly leadService: LeadService,
        private readonly notificationsService: NotificationsService,
        private readonly noShowDetection: NoShowDetectionService,
    ) { }

    async handleMeetingOutcome(params: {
        meetingId: string;
        status: 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED';
        notes?: string;
        userId?: string;
    }) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: params.meetingId },
            include: { lead: true },
        });

        if (!meeting) {
            throw new NotFoundException('Meeting not found');
        }

        const updated = await this.prisma.meeting.update({
            where: { id: params.meetingId },
            data: {
                status: params.status as any,
                outcome: params.notes || `Marked as ${params.status}`,
            },
        });

        await this.prisma.activity.create({
            data: {
                leadId: meeting.leadId,
                type: params.status === 'COMPLETED' ? 'MEETING_HELD' :
                    params.status === 'NO_SHOW' ? 'MEETING_NO_SHOW' : 'MEETING_CANCELLED',
                content: `Meeting marked as ${params.status}. Notes: ${params.notes || 'None'}`,
                metadata: { meetingId: meeting.id },
                performedById: params.userId,
                automated: !params.userId,
            },
        });

        if (params.status === 'COMPLETED' && meeting.leadId) {
            await this.leadService.updateStage(
                meeting.leadId,
                {
                    stage: 'PROPOSAL_SENT',
                    reason: 'Meeting completed. Proposal required.',
                },
                params.userId,
            );

            await this.notificationsService.notifyLeadUpdate({
                leadId: meeting.leadId,
                type: 'STAGE_CHANGE',
                message: `Proposal needed for ${meeting.lead?.companyName || 'lead'}`,
                data: { meetingId: meeting.id, stage: 'PROPOSAL_SENT' },
                userId: params.userId,
            });
        }

        if (params.status === 'RESCHEDULED' && meeting.lead) {
            const rescheduleLink = this.buildRescheduleLink(meeting.id, meeting.lead.email);
            await this.sendRescheduleEmail(meeting.lead, meeting, rescheduleLink);
        }

        if (params.status === 'NO_SHOW' && meeting.lead) {
            await this.noShowDetection.startNoShowWorkflow({
                meetingId: meeting.id,
                leadId: meeting.leadId,
                trigger: params.userId ? 'manual' : 'auto',
                notes: params.notes,
            });
        }

        return updated;
    }

    /**
     * Find available slots for the sales team
     * Aggregates availability and filters out booked slots
     */
    async findGlobalAvailability(daysAhead: number = 14, durationMinutes: number = 60) {
        try {
            // 1. Get all active sales reps
            const salesReps = await this.prisma.user.findMany({
                where: { role: { in: ['SALES_REP', 'MANAGER', 'ADMIN'] }, isActive: true },
            });

            if (salesReps.length === 0) {
                this.logger.warn('No active sales reps found for availability check');
            }

            // 2. Generate potential slots (Business hours: Mon-Fri, 9-5)
            const potentialSlots = this.generatePotentialSlots(daysAhead, durationMinutes);

            // 3. Get existing meetings linked to sales reps
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + daysAhead + 1);

            // Find meetings where the Lead is assigned to one of our active reps
            const repIds = salesReps.map(r => r.id);
            const existingMeetings = await this.prisma.meeting.findMany({
                where: {
                    startTime: { gte: startDate, lte: endDate },
                    status: { not: 'CANCELLED' },
                    lead: { assignedToId: { in: repIds } }
                },
                select: {
                    startTime: true,
                    endTime: true,
                    lead: { select: { assignedToId: true } }
                },
            });

            // 4. Filter slots based on rep availability
            const availableSlots = potentialSlots.filter(slot => {
                const slotStart = slot.start.getTime();

                // Which reps are busy at this time?
                const busyRepIds = new Set(existingMeetings
                    .filter(m => {
                        const mStart = new Date(m.startTime).getTime();
                        const mEnd = new Date(m.endTime).getTime();
                        return (mStart < slot.end.getTime() && mEnd > slotStart);
                    })
                    .map(m => m.lead?.assignedToId)
                    .filter(id => id !== null && id !== undefined)
                );

                // If number of busy reps < total active reps, someone is free
                // (e.g. if 1 rep busy and 2 active, we have 1 free)
                return busyRepIds.size < salesReps.length;
            });

            return { availableSlots: availableSlots.slice(0, 100) };

        } catch (error) {
            this.logger.error('Failed to calculate availability', error);
            // Fallback to simple simulation
            return { availableSlots: this.generatePotentialSlots(daysAhead, durationMinutes).slice(0, 5) };
        }
    }

    /**
     * Book a meeting publicly
     */
    async bookPublicMeeting(leadId: string, startTime: string, notes?: string) {
        const start = new Date(startTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 60 min default

        // 1. Find a usable sales rep (Round robin or random)
        const salesRep = await this.findAvailableRep(start, end);

        if (!salesRep) {
            throw new Error('No sales representatives available at this time');
        }

        // 2. Assign lead to the rep (if not already assigned)
        const lead = await this.prisma.lead.update({
            where: { id: leadId },
            data: {
                stage: 'MEETING_SCHEDULED',
                assignedToId: salesRep.id
            },
        });

        const description = 'Self-scheduled discovery call via website.' + (notes ? `\n\nClient Notes: ${notes}` : '');

        // 3. Create the meeting
        const meeting = await this.prisma.meeting.create({
            data: {
                title: 'Discovery Call',
                startTime: start,
                endTime: end,
                meetingType: 'DISCOVERY',
                status: 'CONFIRMED',
                leadId: leadId,
                videoLink: 'https://teams.microsoft.com/l/meetup-join/simulated',
                description: description,
                attendees: [
                    { name: 'Host', email: salesRep.email, role: 'host' }
                ]
            },
        });

        // 4. Log activity
        await this.prisma.activity.create({
            data: {
                leadId: leadId,
                type: 'MEETING_SCHEDULED',
                content: `Self-scheduled specific discovery call with ${salesRep.firstName} ${salesRep.lastName}`,
                automated: true,
                metadata: { meetingId: meeting.id },
            },
        });

        // 5. Send Confirmation Email with ICS
        try {
            const icsContent = this.generateIcsContent(meeting, salesRep);
            const teamsLink = meeting.videoLink || '#';
            const googleCalendarLink = this.generateGoogleCalendarLink(meeting);

            await this.emailService.sendEmail({
                to: lead.email,
                subject: `Booking Confirmed: Discovery Call with TachyHealth`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a365d;">Meeting Confirmed</h2>
                        <p>Hi ${lead.firstName},</p>
                        <p>Your discovery call has been scheduled. We look forward to speaking with you!</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Topic:</strong> Discovery Call</p>
                            <p><strong>Time:</strong> ${start.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })} (Local to Server)</p>
                            <p><strong>Host:</strong> ${salesRep.firstName} ${salesRep.lastName}</p>
                        </div>

                        <div style="margin: 30px 0;">
                            <a href="${teamsLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">Join Microsoft Teams Meeting</a>
                        </div>
                        
                        <div style="margin-bottom: 30px;">
                            <p><strong>Add to your calendar:</strong></p>
                            <a href="${googleCalendarLink}" style="color: #2563eb; text-decoration: none; margin-right: 15px;">Google Calendar</a>
                            <span style="color: #64748b;">(Outlook/Apple Calendar attached as .ics)</span>
                        </div>
                        
                        <p>Best regards,<br>The TachyHealth Team</p>
                    </div>
                `,
                attachments: [
                    {
                        filename: 'invite.ics',
                        content: Buffer.from(icsContent),
                        contentType: 'text/calendar'
                    }
                ]
            });
            this.logger.log(`Confirmation email sent to ${lead.email}`);
        } catch (emailErr) {
            this.logger.error('Failed to send confirmation email', emailErr);
            // Don't fail the request if email fails, just log it
        }

        return meeting;
    }

    async confirmPublicMeeting(meetingId: string, email: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { lead: true },
        });

        if (!meeting || !meeting.lead) {
            throw new NotFoundException('Meeting not found');
        }

        if (meeting.lead.email.toLowerCase() !== email.toLowerCase()) {
            throw new NotFoundException('Meeting not found');
        }

        if (meeting.status !== 'CONFIRMED') {
            await this.prisma.meeting.update({
                where: { id: meeting.id },
                data: { status: 'CONFIRMED' },
            });
        }

        await this.prisma.lead.update({
            where: { id: meeting.leadId },
            data: { stage: 'MEETING_SCHEDULED' },
        });

        await this.prisma.activity.create({
            data: {
                leadId: meeting.leadId,
                type: 'MEETING_SCHEDULED',
                content: 'Meeting confirmed by client',
                automated: true,
                metadata: { meetingId: meeting.id },
            },
        });

        return meeting;
    }

    private generateGoogleCalendarLink(meeting: any) {
        const start = new Date(meeting.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const end = new Date(meeting.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const title = encodeURIComponent(meeting.title);
        const details = encodeURIComponent(meeting.description || '');
        const location = encodeURIComponent('Microsoft Teams');

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    }

    private generateIcsContent(meeting: any, rep: any): string {
        const start = new Date(meeting.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const end = new Date(meeting.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const now = new Date().toISOString().replace(/-|:|\.\d\d\d/g, '');

        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TachyHealth//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${meeting.id}
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${meeting.title}
DESCRIPTION:${meeting.description}
LOCATION:Microsoft Teams
ORGANIZER;CN=${rep.firstName} ${rep.lastName}:mailto:${rep.email}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.trim();
    }

    private async findAvailableRep(start: Date, end: Date) {
        // Find all reps
        const reps = await this.prisma.user.findMany({
            where: { role: { in: ['SALES_REP', 'MANAGER', 'ADMIN'] }, isActive: true },
        });

        if (reps.length === 0) {
            return this.prisma.user.findFirst();
        }

        // Shuffle reps to distribute load randomly
        const shuffledReps = reps.sort(() => 0.5 - Math.random());

        // Check each rep's schedule (meetings assigned to their leads)
        for (const rep of shuffledReps) {
            const conflict = await this.prisma.meeting.findFirst({
                where: {
                    lead: { assignedToId: rep.id },
                    status: { not: 'CANCELLED' },
                    startTime: { lt: end },
                    endTime: { gt: start },
                },
            });

            if (!conflict) return rep;
        }

        return null; // All booked
    }

    private buildRescheduleLink(meetingId: string, email?: string) {
        const token = email ? Buffer.from(email).toString('base64') : 'no-email';
        return `https://app.tachyhealth.com/reschedule/${meetingId}?token=${token}`;
    }

    private async sendRescheduleEmail(lead: any, meeting: any, rescheduleLink: string) {
        if (!lead.email) {
            this.logger.warn(`Lead ${lead.id} has no email, skipping reschedule email`);
            return;
        }
        const subject = `Reschedule Your TachyHealth Meeting`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Let's Reschedule</h2>
                <p>Hi ${lead.firstName || 'there'},</p>
                <p>We'd love to find a new time that works better for you.</p>
                <p style="margin: 24px 0;">
                    <a href="${rescheduleLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Pick a New Time
                    </a>
                </p>
                <p>If you need anything before then, just reply to this email.</p>
                <p>— TachyHealth Team</p>
            </div>
        `;

        await this.emailService.sendEmail({
            to: lead.email,
            subject,
            html,
            trackOpens: true,
            trackClicks: true,
            metadata: { type: 'reschedule', meetingId: meeting.id },
        }, lead.id);
    }


    private generatePotentialSlots(days: number, durationMinutes: number) {
        const slots: { start: Date; end: Date }[] = [];
        const now = new Date();
        now.setMinutes(0, 0, 0); // Round to hour

        // Start from tomorrow
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 1);

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // Slots: 9 AM to 5 PM
            for (let hour = 9; hour < 17; hour++) {
                const slotStart = new Date(date);
                slotStart.setHours(hour, 0, 0, 0);

                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(durationMinutes);

                // Add :00 slot
                slots.push({ start: slotStart, end: slotEnd });
            }
        }
        return slots;
    }
}
