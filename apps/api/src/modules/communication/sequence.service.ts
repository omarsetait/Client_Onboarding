import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';

export interface SequenceStep {
    templateId: string;
    delayDays: number;
    condition?: {
        type: 'no_response' | 'no_open' | 'always';
    };
}

export interface SequenceConfig {
    id: string;
    name: string;
    steps: SequenceStep[];
    exitConditions: {
        onReply: boolean;
        onMeeting: boolean;
        onUnsubscribe: boolean;
    };
}

// In-memory sequence tracking for Phase 2 MVP
interface ActiveSequence {
    id: string;
    leadId: string;
    sequenceId: string;
    currentStep: number;
    status: 'ACTIVE' | 'COMPLETED' | 'STOPPED';
    startedAt: Date;
}

@Injectable()
export class SequenceService {
    private readonly logger = new Logger(SequenceService.name);
    private activeSequences: Map<string, ActiveSequence> = new Map();

    // Default sequences
    private readonly sequences: SequenceConfig[] = [
        {
            id: 'new-lead-nurture',
            name: 'New Lead Nurture',
            steps: [
                { templateId: 'acknowledgment', delayDays: 0 },
                { templateId: 'follow-up-1', delayDays: 2, condition: { type: 'no_response' } },
                { templateId: 'demo-invite', delayDays: 4, condition: { type: 'no_response' } },
            ],
            exitConditions: { onReply: true, onMeeting: true, onUnsubscribe: true },
        },
        {
            id: 'hot-lead-engagement',
            name: 'Hot Lead Engagement',
            steps: [
                { templateId: 'demo-invite', delayDays: 0 },
                { templateId: 'follow-up-1', delayDays: 1, condition: { type: 'no_response' } },
            ],
            exitConditions: { onReply: true, onMeeting: true, onUnsubscribe: true },
        },
    ];

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly templateService: EmailTemplateService,
    ) { }

    async startSequence(leadId: string, sequenceId: string): Promise<void> {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence) {
            throw new Error(`Sequence ${sequenceId} not found`);
        }

        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) {
            throw new Error(`Lead ${leadId} not found`);
        }

        // Check if already in a sequence
        const existingKey = `${leadId}-${sequenceId}`;
        if (this.activeSequences.has(existingKey)) {
            this.logger.warn(`Lead ${leadId} already in sequence ${sequenceId}`);
            return;
        }

        // Create sequence record
        const sequenceRecord: ActiveSequence = {
            id: existingKey,
            leadId,
            sequenceId,
            currentStep: 0,
            status: 'ACTIVE',
            startedAt: new Date(),
        };

        this.activeSequences.set(existingKey, sequenceRecord);

        this.logger.log(`Started sequence ${sequence.name} for lead ${leadId}`);

        // Execute first step immediately if delay is 0
        if (sequence.steps[0]?.delayDays === 0) {
            await this.executeStep(existingKey, 0);
        }
    }

    async executeStep(sequenceKey: string, stepIndex: number): Promise<void> {
        const activeSeq = this.activeSequences.get(sequenceKey);
        if (!activeSeq || activeSeq.status !== 'ACTIVE') {
            return;
        }

        const sequence = this.sequences.find(s => s.id === activeSeq.sequenceId);
        if (!sequence) return;

        const step = sequence.steps[stepIndex];
        if (!step) {
            // Sequence complete
            activeSeq.status = 'COMPLETED';
            this.activeSequences.set(sequenceKey, activeSeq);
            return;
        }

        const lead = await this.prisma.lead.findUnique({ where: { id: activeSeq.leadId } });
        if (!lead) return;

        // Get template and render
        const template = await this.templateService.getTemplate(step.templateId);
        if (!template) {
            this.logger.error(`Template ${step.templateId} not found`);
            return;
        }

        const { subject, body } = this.templateService.render(template, {
            firstName: lead.firstName,
            lastName: lead.lastName,
            companyName: lead.companyName,
            jobTitle: lead.jobTitle || undefined,
            industry: lead.industry || undefined,
        });

        // Send email
        await this.emailService.sendEmail(
            {
                to: lead.email,
                subject,
                html: body,
                trackOpens: true,
                trackClicks: true,
                metadata: { sequenceKey, stepIndex },
            },
            activeSeq.leadId,
        );

        // Update sequence
        activeSeq.currentStep = stepIndex + 1;
        this.activeSequences.set(sequenceKey, activeSeq);

        this.logger.log(`Executed step ${stepIndex} for sequence ${sequenceKey}`);
    }

    async stopSequence(sequenceKey: string, reason: string): Promise<void> {
        const activeSeq = this.activeSequences.get(sequenceKey);
        if (activeSeq) {
            activeSeq.status = 'STOPPED';
            this.activeSequences.set(sequenceKey, activeSeq);
            this.logger.log(`Stopped sequence ${sequenceKey}: ${reason}`);
        }
    }

    getAvailableSequences(): SequenceConfig[] {
        return this.sequences;
    }
}
