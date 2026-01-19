import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class ScheduledJobsService {
    private readonly logger = new Logger(ScheduledJobsService.name);

    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
    ) {
        this.initializeCronJobs();
    }

    private initializeCronJobs() {
        // Run daily at 9 AM - Check for stale leads and send follow-ups
        cron.schedule('0 9 * * *', () => {
            this.processStaleLeads();
        });

        // Run every hour - Check for scheduled sequences
        cron.schedule('0 * * * *', () => {
            this.processScheduledEmails();
        });

        this.logger.log('Cron jobs initialized');
    }

    /**
     * Find leads that haven't been contacted in X days and trigger follow-ups
     */
    async processStaleLeads() {
        this.logger.log('Processing stale leads...');

        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Find leads in nurturing stages with no recent activity
        const staleLeads = await this.prisma.lead.findMany({
            where: {
                AND: [
                    {
                        stage: {
                            in: ['QUALIFYING', 'HOT_ENGAGED', 'WARM_NURTURING'],
                        },
                    },
                    {
                        stage: {
                            notIn: ['CLOSED_WON', 'CLOSED_LOST', 'DISQUALIFIED', 'COLD_ARCHIVED'],
                        },
                    },
                ],
                // No activities in the last 2 days
                activities: {
                    none: {
                        createdAt: { gte: twoDaysAgo },
                    },
                },
                // But created more than 2 days ago
                createdAt: { lte: twoDaysAgo },
            },
            include: {
                communications: {
                    where: { direction: 'OUTBOUND', channel: 'EMAIL' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        this.logger.log(`Found ${staleLeads.length} stale leads to process`);

        for (const lead of staleLeads) {
            const lastEmail = lead.communications[0];
            const daysSinceLastEmail = lastEmail
                ? Math.floor((Date.now() - new Date(lastEmail.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                : 999;

            // Only follow up if it's been at least 2 days since last email
            if (daysSinceLastEmail >= 2) {
                // Check how many follow-ups we've sent
                const followUpCount = await this.prisma.communication.count({
                    where: {
                        leadId: lead.id,
                        channel: 'EMAIL',
                        direction: 'OUTBOUND',
                        metadata: { path: ['type'], equals: 'follow_up' },
                    },
                });

                // Max 3 follow-ups
                if (followUpCount < 3) {
                    await this.agentQueue.add('process-lead', {
                        leadId: lead.id,
                        step: 'follow-up',
                    });
                    this.logger.log(`Queued follow-up for lead ${lead.id} (follow-up #${followUpCount + 1})`);
                } else if (followUpCount >= 3 && lead.stage !== 'COLD_ARCHIVED') {
                    // Archive lead after 3 follow-ups with no response
                    await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: { stage: 'COLD_ARCHIVED' },
                    });
                    this.logger.log(`Archived lead ${lead.id} after ${followUpCount} follow-ups`);
                }
            }
        }
    }

    /**
     * Process any scheduled email sequences
     */
    async processScheduledEmails() {
        // This would process email sequences from the database
        // For now, the SequenceService handles this in-memory
        this.logger.log('Checking scheduled emails...');
    }
}
