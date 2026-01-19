import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { EmailService } from '../communication/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AutoSchedulerService {
    private readonly logger = new Logger(AutoSchedulerService.name);
    private readonly salesRepEmail: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly graphService: MicrosoftGraphService,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,
    ) {
        this.salesRepEmail = configService.get<string>(
            'DEFAULT_SALES_REP_EMAIL',
            'sales@tachyhealth.com',
        );
    }

    /**
     * Automatically schedule a meeting for a lead
     * Finds the next available slot and creates a Teams meeting
     */
    async autoScheduleMeeting(
        leadId: string,
        meetingType: 'discovery' | 'demo' | 'technical' | 'closing' = 'discovery',
        preferredSlot?: { start: Date; end: Date },
    ): Promise<{
        success: boolean;
        meeting?: { id: string; joinUrl: string; start: Date; end: Date };
        error?: string;
    }> {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: { assignedTo: true },
        });

        if (!lead) {
            return { success: false, error: 'Lead not found' };
        }

        if (!this.graphService.isAvailable()) {
            this.logger.warn('Microsoft Graph not available - simulating meeting scheduling');
            return this.simulateMeetingScheduling(lead, meetingType);
        }

        try {
            // Get the sales rep email (assigned user or default)
            const repEmail = lead.assignedTo?.email || this.salesRepEmail;

            // Duration based on meeting type
            const durationMinutes = {
                discovery: 30,
                demo: 45,
                technical: 60,
                closing: 30,
            }[meetingType];

            let slot: { start: Date; end: Date };

            if (preferredSlot) {
                slot = preferredSlot;
            } else {
                // Find available slots
                const availableSlots = await this.graphService.findAvailableSlots(
                    repEmail,
                    durationMinutes,
                    7, // Look 7 days ahead
                );

                if (availableSlots.length === 0) {
                    return { success: false, error: 'No available slots found' };
                }

                slot = availableSlots[0]; // Take first available
            }

            // Create Teams meeting
            const meetingSubject = this.getMeetingSubject(meetingType, lead.companyName);
            const meetingBody = this.getMeetingBody(meetingType, lead);

            const meeting = await this.graphService.createTeamsMeeting({
                subject: meetingSubject,
                startTime: slot.start,
                endTime: slot.end,
                attendees: [
                    { email: lead.email, name: `${lead.firstName} ${lead.lastName}` },
                    { email: repEmail },
                ],
                isOnlineMeeting: true,
                body: meetingBody,
            });

            // Save meeting to database
            await this.prisma.meeting.create({
                data: {
                    leadId,
                    title: meeting.subject,
                    meetingType: meetingType.toUpperCase() as any,
                    startTime: meeting.start,
                    endTime: meeting.end,
                    location: meeting.joinUrl || 'Microsoft Teams',
                    videoLink: meeting.joinUrl,
                    videoProvider: 'TEAMS',
                    status: 'SCHEDULED',
                    externalEventId: meeting.id,
                },
            });

            // Update lead stage
            await this.prisma.lead.update({
                where: { id: leadId },
                data: { stage: 'MEETING_SCHEDULED' },
            });

            // Log activity
            await this.prisma.activity.create({
                data: {
                    leadId,
                    type: 'MEETING_SCHEDULED',
                    content: `${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)} call scheduled for ${meeting.start.toLocaleString()}`,
                    automated: true,
                    metadata: {
                        meetingId: meeting.id,
                        joinUrl: meeting.joinUrl,
                    },
                },
            });

            // Send confirmation email
            await this.sendMeetingConfirmation(lead, meeting, meetingType);

            this.logger.log(`Meeting scheduled for lead ${leadId} at ${meeting.start}`);

            return {
                success: true,
                meeting: {
                    id: meeting.id,
                    joinUrl: meeting.joinUrl || '',
                    start: meeting.start,
                    end: meeting.end,
                },
            };
        } catch (error) {
            this.logger.error('Failed to schedule meeting', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    private getMeetingSubject(
        type: 'discovery' | 'demo' | 'technical' | 'closing',
        companyName: string,
    ): string {
        const subjects = {
            discovery: `TachyHealth Discovery Call - ${companyName}`,
            demo: `TachyHealth Product Demo - ${companyName}`,
            technical: `TachyHealth Technical Deep Dive - ${companyName}`,
            closing: `TachyHealth Partnership Discussion - ${companyName}`,
        };
        return subjects[type];
    }

    private getMeetingBody(
        type: 'discovery' | 'demo' | 'technical' | 'closing',
        lead: any,
    ): string {
        const bodies = {
            discovery: `
        <h2>Discovery Call with ${lead.firstName} ${lead.lastName}</h2>
        <p>Thank you for your interest in TachyHealth! During this call, we'll:</p>
        <ul>
          <li>Learn about ${lead.companyName}'s current challenges</li>
          <li>Discuss your goals and requirements</li>
          <li>Explore how TachyHealth can help</li>
        </ul>
        <p>Looking forward to speaking with you!</p>
      `,
            demo: `
        <h2>Product Demo for ${lead.companyName}</h2>
        <p>We're excited to show you TachyHealth in action!</p>
        <p>This demo will cover:</p>
        <ul>
          <li>AI-powered claims processing</li>
          <li>Real-time analytics dashboard</li>
          <li>Integration capabilities</li>
        </ul>
      `,
            technical: `
        <h2>Technical Deep Dive</h2>
        <p>This session will cover:</p>
        <ul>
          <li>Architecture overview</li>
          <li>Security and compliance</li>
          <li>Integration requirements</li>
          <li>Implementation timeline</li>
        </ul>
      `,
            closing: `
        <h2>Partnership Discussion</h2>
        <p>Let's finalize the details and next steps for our partnership.</p>
      `,
        };
        return bodies[type];
    }

    private async sendMeetingConfirmation(
        lead: any,
        meeting: { start: Date; joinUrl?: string },
        type: string,
    ): Promise<void> {
        const formattedDate = meeting.start.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const formattedTime = meeting.start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });

        await this.emailService.sendEmail(
            {
                to: lead.email,
                subject: `Meeting Confirmed: ${type.charAt(0).toUpperCase() + type.slice(1)} Call on ${formattedDate}`,
                html: `
          <p>Hi ${lead.firstName},</p>
          
          <p>Your meeting with TachyHealth has been confirmed!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📅 Date:</strong> ${formattedDate}</p>
            <p><strong>🕐 Time:</strong> ${formattedTime}</p>
            ${meeting.joinUrl ? `<p><strong>🔗 Join:</strong> <a href="${meeting.joinUrl}">Click here to join Teams meeting</a></p>` : ''}
          </div>
          
          <p>Please add this to your calendar. If you need to reschedule, just reply to this email.</p>
          
          <p>Looking forward to speaking with you!</p>
          
          <p>Best,<br>The TachyHealth Team</p>
        `,
                trackOpens: true,
                trackClicks: true,
            },
            lead.id,
        );
    }

    private async simulateMeetingScheduling(
        lead: any,
        meetingType: string,
    ): Promise<{ success: boolean; meeting?: any; error?: string }> {
        // Simulate scheduling when Microsoft Graph is not configured
        const now = new Date();
        const meetingStart = new Date(now);
        meetingStart.setDate(meetingStart.getDate() + 2);
        meetingStart.setHours(10, 0, 0, 0);

        const meetingEnd = new Date(meetingStart);
        meetingEnd.setMinutes(meetingEnd.getMinutes() + 30);

        const simulatedMeeting = {
            id: `sim-${Date.now()}`,
            joinUrl: 'https://teams.microsoft.com/simulated-meeting',
            start: meetingStart,
            end: meetingEnd,
        };

        // Save to database
        await this.prisma.meeting.create({
            data: {
                leadId: lead.id,
                title: `TachyHealth ${meetingType} - ${lead.companyName}`,
                meetingType: meetingType.toUpperCase() as any,
                startTime: meetingStart,
                endTime: meetingEnd,
                location: 'Microsoft Teams (Simulated)',
                videoLink: simulatedMeeting.joinUrl,
                videoProvider: 'TEAMS',
                status: 'SCHEDULED',
                externalEventId: simulatedMeeting.id,
            },
        });

        // Update lead stage
        await this.prisma.lead.update({
            where: { id: lead.id },
            data: { stage: 'MEETING_SCHEDULED' },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                leadId: lead.id,
                type: 'MEETING_SCHEDULED',
                content: `[SIMULATED] ${meetingType} call scheduled for ${meetingStart.toLocaleString()}`,
                automated: true,
                metadata: simulatedMeeting,
            },
        });

        this.logger.log(`[SIMULATED] Meeting scheduled for lead ${lead.id}`);

        return { success: true, meeting: simulatedMeeting };
    }
}
