import { Processor, Process, OnQueueFailed, OnQueueActive, OnQueueCompleted } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AgentOrchestrator } from '../modules/ai-agents/orchestrator.service';
import { EmailService } from '../modules/communication/email.service';
import { EmailTemplateService } from '../modules/communication/email-template.service';

interface LeadProcessJob {
    leadId: string;
    step: 'qualification' | 'enrichment' | 'follow-up';
}

interface NoShowFollowUpJob {
    leadId: string;
    meetingId: string;
    step: 'apology' | 'rep-call' | 'formal-reschedule' | 'finalize';
}

@Processor('agent-tasks')
export class LeadPipelineProcessor implements OnModuleInit {
    private readonly logger = new Logger(LeadPipelineProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly orchestrator: AgentOrchestrator,
        private readonly emailService: EmailService,
        private readonly templateService: EmailTemplateService,
    ) { }

    onModuleInit() {
        this.logger.log('🚀 LeadPipelineProcessor initialized - ready to process jobs');
    }

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.log(`📦 Job ${job.id} started: ${job.name} with data: ${JSON.stringify(job.data)}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job, result: any) {
        this.logger.log(`✅ Job ${job.id} completed: ${job.name}`);
    }

    @Process('process-lead')
    async handleProcessLead(job: Job<LeadProcessJob>) {
        const { leadId, step } = job.data;
        this.logger.log(`Processing lead ${leadId} - Step: ${step}`);

        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) {
            this.logger.error(`Lead ${leadId} not found`);
            return;
        }

        switch (step) {
            case 'qualification':
                await this.runQualification(leadId);
                break;
            case 'enrichment':
                await this.runEnrichment(leadId);
                break;
            case 'follow-up':
                await this.sendFollowUp(leadId);
                break;
        }
    }

    @Process('new-lead-pipeline')
    async handleNewLeadPipeline(job: Job<{ leadId: string }>) {
        const { leadId } = job.data;
        this.logger.log(`Starting full pipeline for new lead ${leadId}`);

        // Step 1: Qualify the lead (score it)
        await this.runQualification(leadId);

        // Step 2: Enrich with research data
        await this.runEnrichment(leadId);

        // Step 3: Schedule follow-up for 2 days later (if no response)
        await job.queue.add(
            'process-lead',
            { leadId, step: 'follow-up' } as any,
            { delay: 2 * 24 * 60 * 60 * 1000 }, // 2 days
        );

        this.logger.log(`Pipeline initiated for lead ${leadId}`);
    }

    @Process('no-show-follow-up')
    async handleNoShowFollowUp(job: Job<NoShowFollowUpJob>) {
        const { leadId, meetingId, step } = job.data;
        this.logger.log(`No-show follow-up for lead ${leadId} - Step: ${step}`);

        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { lead: true },
        });

        if (!meeting || !meeting.lead) {
            this.logger.warn(`Meeting ${meetingId} not found for no-show follow-up`);
            return;
        }

        const lead = meeting.lead;

        if (meeting.status !== 'NO_SHOW') {
            this.logger.log(`Meeting ${meetingId} is not marked NO_SHOW, skipping step ${step}`);
            return;
        }

        if (step === 'apology') {
            const rescheduleLink = this.buildRescheduleLink(meetingId, lead.email);
            const slots = this.generateRescheduleSlots();

            await this.emailService.sendEmail({
                to: lead.email,
                subject: `We missed you — let's reschedule`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a365d;">Sorry we missed you</h2>
                        <p>Hi ${lead.firstName || 'there'},</p>
                        <p>We noticed we missed our call. No worries — we'd still love to connect.</p>
                        <p>Here are a few suggested times:</p>
                        <ul>
                            ${slots.map(slot => `<li>${slot}</li>`).join('')}
                        </ul>
                        <p style="margin: 24px 0;">
                            <a href="${rescheduleLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Pick a New Time
                            </a>
                        </p>
                        <p>— TachyHealth Team</p>
                    </div>
                `,
                trackOpens: true,
                trackClicks: true,
                metadata: { type: 'no_show_apology', meetingId },
            }, leadId);

            return;
        }

        if (step === 'rep-call') {
            await this.prisma.activity.create({
                data: {
                    leadId: lead.id,
                    type: 'TASK_CREATED',
                    content: 'Call lead and send LinkedIn follow-up after no-show',
                    automated: true,
                    metadata: { meetingId, channels: ['PHONE', 'LINKEDIN'] },
                },
            });
            return;
        }

        if (step === 'formal-reschedule') {
            const rescheduleLink = this.buildRescheduleLink(meetingId, lead.email);
            await this.emailService.sendEmail({
                to: lead.email,
                subject: `Reschedule your TachyHealth session`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a365d;">Still interested in connecting?</h2>
                        <p>Hi ${lead.firstName || 'there'},</p>
                        <p>We’d love to help — if it’s easier, you can pick a new time below.</p>
                        <p style="margin: 24px 0;">
                            <a href="${rescheduleLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Reschedule Now
                            </a>
                        </p>
                        <p>Prefer async? Here are options:</p>
                        <ul>
                            <li><a href="https://tachyhealth.com/demo">Watch the demo video</a></li>
                            <li><a href="https://tachyhealth.com/overview.pdf">Download the overview PDF</a></li>
                        </ul>
                        <p>— TachyHealth Team</p>
                    </div>
                `,
                trackOpens: true,
                trackClicks: true,
                metadata: { type: 'no_show_formal_reschedule', meetingId },
            }, leadId);

            return;
        }

        if (step === 'finalize') {
            const originalScore = lead.score || 0;
            const newScore = Math.max(0, originalScore - 10);
            const isHigh = originalScore >= 70 || lead.stage === 'HOT_ENGAGED';
            const isLow = originalScore < 50;
            const targetStage = isHigh ? 'WARM_NURTURING' : (isLow ? 'COLD_ARCHIVED' : 'WARM_NURTURING');

            await this.prisma.lead.update({
                where: { id: lead.id },
                data: {
                    score: newScore,
                    stage: targetStage,
                },
            });

            await this.prisma.activity.create({
                data: {
                    leadId: lead.id,
                    type: 'SCORE_UPDATED',
                    content: `Score decreased by 10 due to no-show. New score: ${newScore}`,
                    automated: true,
                    metadata: { previousScore: originalScore, newScore, meetingId },
                },
            });

            if (lead.stage !== targetStage) {
                await this.prisma.stageHistory.create({
                    data: {
                        leadId: lead.id,
                        fromStage: lead.stage,
                        toStage: targetStage,
                        reason: 'No-show finalization',
                        automated: true,
                    },
                });

                await this.prisma.activity.create({
                    data: {
                        leadId: lead.id,
                        type: 'STAGE_CHANGED',
                        content: `Stage changed from ${lead.stage} to ${targetStage}`,
                        automated: true,
                        metadata: { meetingId, trigger: 'no_show_final' },
                    },
                });
            }

            if (isHigh) {
                await this.prisma.activity.create({
                    data: {
                        leadId: lead.id,
                        type: 'WORKFLOW_TRIGGERED',
                        content: 'Manager review required: high-score lead no-show',
                        automated: true,
                        metadata: { meetingId, score: originalScore },
                    },
                });
            }
        }
    }

    private buildRescheduleLink(meetingId: string, email?: string) {
        const token = email ? Buffer.from(email).toString('base64') : 'no-email';
        return `https://app.tachyhealth.com/reschedule/${meetingId}?token=${token}`;
    }

    private generateRescheduleSlots() {
        const slots: string[] = [];
        const now = new Date();

        let dayOffset = 1;
        while (slots.length < 3) {
            const date = new Date(now);
            date.setDate(date.getDate() + dayOffset);

            const day = date.getDay();
            if (day !== 0 && day !== 6) {
                date.setHours(10, 0, 0, 0);
                slots.push(date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
            }

            dayOffset += 1;
        }

        return slots;
    }

    private async runQualification(leadId: string) {
        this.logger.log(`Scoring lead ${leadId}`);
        const result = await this.orchestrator.scoreLead(leadId);

        if (result.success) {
            this.logger.log(`Lead ${leadId} scored: ${JSON.stringify(result.data)}`);
        } else {
            this.logger.error(`Failed to score lead ${leadId}: ${result.error}`);
        }
    }

    private async runEnrichment(leadId: string) {
        this.logger.log(`Enriching lead ${leadId}`);
        const result = await this.orchestrator.executeAgent('research', null, { leadId });

        if (result.success) {
            this.logger.log(`Lead ${leadId} enriched`);
        } else {
            this.logger.warn(`Enrichment failed for lead ${leadId}: ${result.error}`);
        }
    }



    private async sendFollowUp(leadId: string) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: { communications: { where: { direction: 'INBOUND' } } },
        });

        if (!lead) return;

        // Check if lead has responded
        if (lead.communications.length > 0) {
            this.logger.log(`Lead ${leadId} has responded, skipping follow-up`);
            return;
        }

        // Check if meeting already scheduled
        if (lead.stage === 'MEETING_SCHEDULED') {
            this.logger.log(`Lead ${leadId} has meeting scheduled, skipping follow-up`);
            return;
        }

        // Generate AI follow-up email
        const result = await this.orchestrator.generateEmail(leadId, 'follow_up');

        if (!result.success || !result.data) {
            this.logger.error(`Failed to generate follow-up for lead ${leadId}`);
            return;
        }

        const emailData = result.data as { subject: string; body: string };

        // Send the email
        const sendResult = await this.emailService.sendEmail(
            {
                to: lead.email,
                subject: emailData.subject,
                html: emailData.body,
                trackOpens: true,
                trackClicks: true,
                metadata: { type: 'follow_up', automated: true },
            },
            leadId,
        );

        if (sendResult.success) {
            this.logger.log(`Follow-up email sent to ${lead.email}`);
        }
    }

    @OnQueueFailed()
    handleFailure(job: Job, error: Error) {
        this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    }
}
