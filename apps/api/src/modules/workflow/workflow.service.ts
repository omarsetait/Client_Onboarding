import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type LeadStage = 'NEW' | 'QUALIFYING' | 'HOT_ENGAGED' | 'WARM_NURTURING' | 'COLD_ARCHIVED' | 'MEETING_SCHEDULED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST' | 'DISQUALIFIED';

interface Lead {
    id: string;
    score: number;
    stage: LeadStage;
    [key: string]: unknown;
}

// Lead lifecycle state machine
interface StateTransition {
    from: LeadStage[];
    to: LeadStage;
    conditions?: (lead: Lead) => boolean;
    actions?: string[];
}

interface WorkflowRule {
    id: string;
    name: string;
    trigger: {
        type: 'stage_change' | 'score_change' | 'time_elapsed' | 'activity';
        config: Record<string, unknown>;
    };
    conditions: {
        field: string;
        operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
        value: unknown;
    }[];
    actions: {
        type: 'change_stage' | 'send_email' | 'create_task' | 'notify' | 'score_update';
        config: Record<string, unknown>;
    }[];
}

@Injectable()
export class WorkflowService {
    private readonly logger = new Logger(WorkflowService.name);

    // Valid state transitions
    private readonly stateTransitions: StateTransition[] = [
        { from: ['NEW'], to: 'QUALIFYING', actions: ['qualify_lead'] },
        { from: ['QUALIFYING'], to: 'HOT_ENGAGED', conditions: (lead) => lead.score >= 80 },
        { from: ['QUALIFYING'], to: 'WARM_NURTURING', conditions: (lead) => lead.score >= 50 && lead.score < 80 },
        { from: ['QUALIFYING'], to: 'COLD_ARCHIVED', conditions: (lead) => lead.score < 50 },
        { from: ['QUALIFYING'], to: 'DISQUALIFIED' },
        { from: ['HOT_ENGAGED', 'WARM_NURTURING'], to: 'MEETING_SCHEDULED' },
        { from: ['MEETING_SCHEDULED'], to: 'PROPOSAL_SENT' },
        { from: ['PROPOSAL_SENT'], to: 'NEGOTIATION' },
        { from: ['NEGOTIATION'], to: 'CLOSED_WON' },
        { from: ['NEGOTIATION'], to: 'CLOSED_LOST' },
        { from: ['HOT_ENGAGED', 'WARM_NURTURING', 'MEETING_SCHEDULED', 'PROPOSAL_SENT'], to: 'CLOSED_LOST' },
    ];

    // Automation rules
    private readonly automationRules: WorkflowRule[] = [
        {
            id: 'new-lead-acknowledgment',
            name: 'Acknowledge New Lead',
            trigger: { type: 'stage_change', config: { to: 'NEW' } },
            conditions: [],
            actions: [
                { type: 'send_email', config: { template: 'acknowledgment' } },
                { type: 'create_task', config: { title: 'Review new lead', dueDays: 1 } },
            ],
        },
        {
            id: 'hot-lead-alert',
            name: 'Hot Lead Alert',
            trigger: { type: 'score_change', config: { threshold: 80 } },
            conditions: [
                { field: 'score', operator: 'greater_than', value: 79 },
            ],
            actions: [
                { type: 'notify', config: { channel: 'slack', message: 'Hot lead detected!' } },
                { type: 'change_stage', config: { stage: 'HOT_ENGAGED' } },
            ],
        },
    ];

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Check if a stage transition is valid
     */
    isValidTransition(currentStage: LeadStage, newStage: LeadStage, lead: Lead): boolean {
        const transition = this.stateTransitions.find(
            t => t.from.includes(currentStage) && t.to === newStage
        );

        if (!transition) {
            return false;
        }

        if (transition.conditions && !transition.conditions(lead)) {
            return false;
        }

        return true;
    }

    /**
     * Execute stage transition with side effects
     */
    async transitionStage(
        leadId: string,
        newStage: LeadStage,
        reason?: string,
        userId?: string,
    ): Promise<{ success: boolean; error?: string }> {
        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });

        if (!lead) {
            return { success: false, error: 'Lead not found' };
        }

        const currentStage = lead.stage as LeadStage;

        if (!this.isValidTransition(currentStage, newStage, lead as unknown as Lead)) {
            return {
                success: false,
                error: `Invalid transition from ${currentStage} to ${newStage}`
            };
        }

        // Perform transition
        await this.prisma.$transaction(async (tx) => {
            // Update lead
            await tx.lead.update({
                where: { id: leadId },
                data: { stage: newStage },
            });

            // Record stage history
            await tx.stageHistory.create({
                data: {
                    leadId,
                    fromStage: currentStage,
                    toStage: newStage,
                    reason: reason || 'Manual transition',
                    changedById: userId,
                    automated: !userId,
                },
            });

            // Log activity
            await tx.activity.create({
                data: {
                    leadId,
                    type: 'STAGE_CHANGED',
                    content: `Stage changed from ${currentStage} to ${newStage}`,
                    metadata: JSON.parse(JSON.stringify({ from: currentStage, to: newStage, reason })),
                    performedById: userId,
                    automated: !userId,
                },
            });
        });

        this.logger.log(`Lead ${leadId} transitioned: ${currentStage} → ${newStage}`);

        return { success: true };
    }

    /**
     * Get stage history for a lead
     */
    async getStageHistory(leadId: string) {
        return this.prisma.stageHistory.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get available next stages for a lead
     */
    getAvailableTransitions(currentStage: LeadStage): LeadStage[] {
        return this.stateTransitions
            .filter(t => t.from.includes(currentStage))
            .map(t => t.to);
    }
}
