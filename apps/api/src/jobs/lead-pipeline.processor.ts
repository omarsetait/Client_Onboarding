import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AgentOrchestrator } from '../modules/ai-agents/orchestrator.service';
import { EmailService } from '../modules/communication/email.service';
import { EmailTemplateService } from '../modules/communication/email-template.service';

interface LeadProcessJob {
    leadId: string;
    step: 'qualification' | 'enrichment' | 'acknowledgment' | 'follow-up';
}

@Processor('agent-tasks')
export class LeadPipelineProcessor {
    private readonly logger = new Logger(LeadPipelineProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly orchestrator: AgentOrchestrator,
        private readonly emailService: EmailService,
        private readonly templateService: EmailTemplateService,
    ) { }

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
            case 'acknowledgment':
                await this.sendAcknowledgment(leadId);
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

        // Step 3: Send acknowledgment email (within 5 minutes)
        await this.sendAcknowledgment(leadId);

        // Step 4: Schedule follow-up for 2 days later (if no response)
        await job.queue.add(
            'process-lead',
            { leadId, step: 'follow-up' } as any,
            { delay: 2 * 24 * 60 * 60 * 1000 }, // 2 days
        );

        this.logger.log(`Pipeline initiated for lead ${leadId}`);
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

    private async sendAcknowledgment(leadId: string) {
        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return;

        // Check if acknowledgment already sent
        const existingEmail = await this.prisma.communication.findFirst({
            where: {
                leadId,
                channel: 'EMAIL',
                subject: { contains: 'Thanks for reaching out' },
            },
        });

        if (existingEmail) {
            this.logger.log(`Acknowledgment already sent to lead ${leadId}`);
            return;
        }

        // Get template and render
        const template = await this.templateService.getTemplate('acknowledgment');
        if (!template) {
            this.logger.error('Acknowledgment template not found');
            return;
        }

        const { subject, body } = this.templateService.render(template, {
            firstName: lead.firstName,
            lastName: lead.lastName,
            companyName: lead.companyName,
            industry: lead.industry || undefined,
        });

        // Send email
        const result = await this.emailService.sendEmail(
            {
                to: lead.email,
                subject,
                html: body,
                trackOpens: true,
                trackClicks: true,
                metadata: { type: 'acknowledgment', automated: true },
            },
            leadId,
        );

        if (result.success) {
            this.logger.log(`Acknowledgment email sent to ${lead.email}`);

            // Update lead stage to QUALIFYING
            await this.prisma.lead.update({
                where: { id: leadId },
                data: { stage: 'QUALIFYING' },
            });
        } else {
            this.logger.error(`Failed to send acknowledgment to ${lead.email}: ${result.error}`);
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
