import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../communication/email.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * NoShowDetectionService
 * 
 * Automatically detects no-shows, triggers follow-ups, and manages rescheduling.
 * Features:
 * - Scans for meetings past their end time with no outcome recorded
 * - Sends no-show follow-up emails with one-click reschedule links
 * - Tracks no-show patterns and adjusts strategy
 * - Escalates repeat no-shows to manager
 */
@Injectable()
export class NoShowDetectionService {
    private readonly logger = new Logger(NoShowDetectionService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
    ) { }

    /**
     * Run every 15 minutes to detect no-shows
     */
    @Cron('*/15 * * * *')
    async detectNoShows(): Promise<void> {
        this.logger.log('Scanning for no-shows...');

        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        // Find meetings that ended 15-120 minutes ago without an outcome
        const potentialNoShows = await this.prisma.meeting.findMany({
            where: {
                status: 'SCHEDULED',
                endTime: {
                    gte: twoHoursAgo,
                    lte: fifteenMinutesAgo,
                },
                outcome: null,
            },
            include: {
                lead: true,
            },
        });

        this.logger.log(`Found ${potentialNoShows.length} potential no-shows`);

        for (const meeting of potentialNoShows) {
            await this.handlePotentialNoShow(meeting);
        }
    }

    private async handlePotentialNoShow(meeting: any): Promise<void> {
        const lead = meeting.lead;

        // Count previous no-shows for this lead
        const previousNoShows = await this.prisma.meeting.count({
            where: {
                leadId: lead.id,
                status: 'NO_SHOW',
            },
        });

        // Update meeting status
        await this.prisma.meeting.update({
            where: { id: meeting.id },
            data: { status: 'NO_SHOW' },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                leadId: lead.id,
                type: 'MEETING_NO_SHOW',
                content: `No-show for meeting: ${meeting.title}. Total no-shows: ${previousNoShows + 1}`,
                automated: true,
                metadata: {
                    meetingId: meeting.id,
                    noShowCount: previousNoShows + 1,
                },
            },
        });

        // Determine follow-up strategy based on no-show count
        const strategy = this.determineNoShowStrategy(previousNoShows + 1);

        // Queue the appropriate follow-up
        await this.agentQueue.add('no-show-follow-up', {
            leadId: lead.id,
            meetingId: meeting.id,
            noShowCount: previousNoShows + 1,
            strategy,
        });

        // Send immediate reschedule email
        await this.sendRescheduleEmail(lead, meeting, strategy);

        // Escalate if needed
        if (strategy.shouldEscalate) {
            await this.escalateNoShow(lead, previousNoShows + 1);
        }

        this.logger.log(`Processed no-show for lead ${lead.id}, strategy: ${strategy.type}`);
    }

    private determineNoShowStrategy(noShowCount: number): {
        type: 'gentle_reminder' | 'friendly_follow_up' | 'shorter_meeting' | 'async_option' | 'deprioritize';
        shouldEscalate: boolean;
        suggestedDuration: number;
        tone: 'warm' | 'professional' | 'direct';
        offerAsync: boolean;
    } {
        if (noShowCount === 1) {
            return {
                type: 'gentle_reminder',
                shouldEscalate: false,
                suggestedDuration: 30, // Same duration
                tone: 'warm',
                offerAsync: false,
            };
        } else if (noShowCount === 2) {
            return {
                type: 'shorter_meeting',
                shouldEscalate: false,
                suggestedDuration: 15, // Shorter meeting
                tone: 'professional',
                offerAsync: true,
            };
        } else if (noShowCount === 3) {
            return {
                type: 'async_option',
                shouldEscalate: true,
                suggestedDuration: 15,
                tone: 'direct',
                offerAsync: true,
            };
        } else {
            return {
                type: 'deprioritize',
                shouldEscalate: true,
                suggestedDuration: 15,
                tone: 'direct',
                offerAsync: true,
            };
        }
    }

    private async sendRescheduleEmail(lead: any, meeting: any, strategy: any): Promise<void> {
        // Generate one-click reschedule link (would be implemented with actual scheduling link)
        const rescheduleLink = `https://app.tachyhealth.com/reschedule/${meeting.id}?token=${Buffer.from(lead.email).toString('base64')}`;

        const subjects: Record<string, string> = {
            gentle_reminder: `We missed you! Let's reschedule, ${lead.firstName}`,
            friendly_follow_up: `Quick follow-up from TachyHealth`,
            shorter_meeting: `How about a quick 15-minute call, ${lead.firstName}?`,
            async_option: `Alternative options to connect`,
            deprioritize: `Still interested in TachyHealth?`,
        };

        const getEmailBody = (): string => {
            const baseIntro = `<p>Hi ${lead.firstName},</p>`;

            if (strategy.type === 'gentle_reminder') {
                return `
                    ${baseIntro}
                    <p>I noticed we missed our scheduled call today. No worries at all – things come up!</p>
                    <p>I'd love to still connect with you to discuss how TachyHealth can help ${lead.companyName} streamline your healthcare operations.</p>
                    <p style="margin: 30px 0;">
                        <a href="${rescheduleLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            📅 Pick a New Time
                        </a>
                    </p>
                    <p>Looking forward to speaking with you soon!</p>
                `;
            } else if (strategy.type === 'shorter_meeting') {
                return `
                    ${baseIntro}
                    <p>I understand schedules can be hectic. How about we try a <strong>quick 15-minute call</strong> instead?</p>
                    <p>I can give you a focused overview of how TachyHealth helps organizations like ${lead.companyName} in just that time.</p>
                    <p style="margin: 30px 0;">
                        <a href="${rescheduleLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            📅 Book 15-Minute Call
                        </a>
                    </p>
                    ${strategy.offerAsync ? `<p>Alternatively, <a href="https://tachyhealth.com/demo">watch our 5-minute demo video</a> at your convenience.</p>` : ''}
                `;
            } else if (strategy.type === 'async_option') {
                return `
                    ${baseIntro}
                    <p>I know finding time for calls can be challenging. Here are some flexible options:</p>
                    <ul>
                        <li>📹 <a href="https://tachyhealth.com/demo">Watch our 5-minute demo</a></li>
                        <li>📄 <a href="https://tachyhealth.com/overview">Download our solution overview</a></li>
                        <li>📅 <a href="${rescheduleLink}">Book a brief 15-minute call</a></li>
                    </ul>
                    <p>Just reply to this email if you have any questions!</p>
                `;
            } else {
                return `
                    ${baseIntro}
                    <p>Are you still interested in exploring how TachyHealth can help ${lead.companyName}?</p>
                    <p>If so, let me know and I'll set up a time that works for you.</p>
                    <p>If timing isn't right, no problem – just reply and let me know, and I'll reach out in the future.</p>
                `;
            }
        };

        await this.emailService.sendEmail({
            to: lead.email,
            subject: subjects[strategy.type],
            html: getEmailBody(),
            trackOpens: true,
            trackClicks: true,
            metadata: {
                type: 'no_show_follow_up',
                noShowCount: strategy.type === 'deprioritize' ? 4 : 1,
                meetingId: meeting.id,
            },
        }, lead.id);
    }

    private async escalateNoShow(lead: any, noShowCount: number): Promise<void> {
        this.logger.warn(`Escalating lead ${lead.id} after ${noShowCount} no-shows`);

        await this.prisma.activity.create({
            data: {
                leadId: lead.id,
                type: 'WORKFLOW_TRIGGERED',
                content: `⚠️ ESCALATION: ${noShowCount} consecutive no-shows. Review lead priority and outreach strategy.`,
                automated: true,
                metadata: {
                    escalationType: 'no_show_pattern',
                    noShowCount,
                    suggestedActions: [
                        'Review lead qualification',
                        'Consider deprioritizing',
                        'Try different communication channel',
                    ],
                },
            },
        });

        // Update lead category if too many no-shows
        if (noShowCount >= 3) {
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: {
                    category: 'COLD',
                    aiInsights: {
                        noShowPattern: true,
                        noShowCount,
                        lastNoShowDate: new Date().toISOString(),
                        suggestedAction: 'Deprioritize or try async content',
                    },
                },
            });
        }
    }

    /**
     * Get one-click reschedule slots for a lead
     */
    async getRescheduleSlots(meetingId: string): Promise<{
        slots: { date: string; time: string; duration: number }[];
        asyncOptions: { type: string; url: string }[];
    }> {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { lead: true },
        });

        if (!meeting) {
            return { slots: [], asyncOptions: [] };
        }

        // Generate 3 suggested slots over the next few days
        const now = new Date();
        const slots = [];

        for (let i = 1; i <= 3; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() + i);

            // Skip weekends
            if (date.getDay() === 0) date.setDate(date.getDate() + 1);
            if (date.getDay() === 6) date.setDate(date.getDate() + 2);

            slots.push({
                date: date.toISOString().split('T')[0],
                time: '10:00',
                duration: 30,
            });
        }

        return {
            slots,
            asyncOptions: [
                { type: 'demo_video', url: 'https://tachyhealth.com/demo' },
                { type: 'overview_pdf', url: 'https://tachyhealth.com/overview.pdf' },
            ],
        };
    }
}
