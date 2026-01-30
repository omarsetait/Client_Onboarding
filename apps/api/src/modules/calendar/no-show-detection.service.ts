import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
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
        @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
    ) { }

    /**
     * Run every 15 minutes to detect no-shows
     */
    @Cron('*/15 * * * *')
    async detectNoShows(): Promise<void> {
        this.logger.log('Scanning for no-shows...');

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        // Find meetings that ended 5-120 minutes ago without an outcome
        const potentialNoShows = await this.prisma.meeting.findMany({
            where: {
                status: 'SCHEDULED',
                endTime: {
                    gte: twoHoursAgo,
                    lte: fiveMinutesAgo,
                },
                outcome: null,
            },
            include: {
                lead: true,
            },
        });

        this.logger.log(`Found ${potentialNoShows.length} potential no-shows`);

        for (const meeting of potentialNoShows) {
            await this.startNoShowWorkflow({
                meetingId: meeting.id,
                leadId: meeting.leadId,
                trigger: 'auto',
            });
        }
    }

    async startNoShowWorkflow(params: {
        meetingId: string;
        leadId: string;
        trigger: 'auto' | 'manual';
        notes?: string;
    }): Promise<void> {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: params.meetingId },
            include: { lead: true },
        });

        if (!meeting || !meeting.lead) {
            return;
        }

        const lead = meeting.lead;

        const previousNoShows = await this.prisma.meeting.count({
            where: {
                leadId: lead.id,
                status: 'NO_SHOW',
            },
        });

        await this.prisma.meeting.update({
            where: { id: meeting.id },
            data: {
                status: 'NO_SHOW',
                outcome: params.notes || meeting.outcome || 'No-show workflow scheduled',
            },
        });

        await this.prisma.activity.create({
            data: {
                leadId: lead.id,
                type: 'MEETING_NO_SHOW',
                content: `No-show workflow started. Total no-shows: ${previousNoShows + 1}`,
                automated: params.trigger !== 'manual',
                metadata: {
                    meetingId: meeting.id,
                    noShowCount: previousNoShows + 1,
                    trigger: params.trigger,
                },
            },
        });

        const now = Date.now();

        await this.agentQueue.add('no-show-follow-up', {
            leadId: lead.id,
            meetingId: meeting.id,
            step: 'apology',
        }, { delay: 60 * 60 * 1000 });

        await this.agentQueue.add('no-show-follow-up', {
            leadId: lead.id,
            meetingId: meeting.id,
            step: 'rep-call',
        }, { delay: 4 * 60 * 60 * 1000 });

        await this.agentQueue.add('no-show-follow-up', {
            leadId: lead.id,
            meetingId: meeting.id,
            step: 'formal-reschedule',
        }, { delay: 24 * 60 * 60 * 1000 });

        await this.agentQueue.add('no-show-follow-up', {
            leadId: lead.id,
            meetingId: meeting.id,
            step: 'finalize',
        }, { delay: 48 * 60 * 60 * 1000 });

        this.logger.log(`No-show workflow scheduled for lead ${lead.id}`);
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
