import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CoordinatorAgent } from './coordinator/coordinator.agent';
import { QualificationAgent } from './qualification/qualification.agent';
import { CommunicationAgent } from './communication/communication.agent';
import { SchedulingAgent } from './scheduling/scheduling.agent';
import { ResearchAgent } from './research/research.agent';
import { DocumentAgent } from './document/document.agent';
import { AnalyticsAgent } from './analytics/analytics.agent';
import { AgentContext, AgentResult } from './base.agent';
import { PrismaService } from '../../prisma/prisma.service';

export interface WorkflowStep {
    agent: string;
    action: string;
    input: unknown;
}

@Injectable()
export class AgentOrchestrator {
    private readonly logger = new Logger(AgentOrchestrator.name);

    constructor(
        @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
        private readonly prisma: PrismaService,
        private readonly coordinatorAgent: CoordinatorAgent,
        private readonly qualificationAgent: QualificationAgent,
        private readonly communicationAgent: CommunicationAgent,
        private readonly schedulingAgent: SchedulingAgent,
        private readonly researchAgent: ResearchAgent,
        private readonly documentAgent: DocumentAgent,
        private readonly analyticsAgent: AnalyticsAgent,
    ) { }

    /**
     * Process a new lead through the AI pipeline
     */
    async processNewLead(leadId: string): Promise<void> {
        this.logger.log(`Starting AI pipeline for lead ${leadId}`);

        // Queue the full lead pipeline (qualification -> enrichment -> follow-up)
        await this.agentQueue.add('new-lead-pipeline', {
            leadId,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
        });
    }

    /**
     * Execute a specific agent with given input
     */
    async executeAgent(
        agentName: string,
        input: unknown,
        context: AgentContext,
    ): Promise<AgentResult> {
        const startTime = Date.now();
        this.logger.log(`🚀 [AGENT_START] Agent: ${agentName} | Lead: ${context.leadId || 'N/A'}`);
        this.logger.debug(`📥 [AGENT_INPUT] Agent: ${agentName} | Input: ${JSON.stringify(input)?.substring(0, 500)}`);

        const agent = this.getAgentByName(agentName);
        if (!agent) {
            this.logger.error(`❌ [AGENT_ERROR] Unknown agent: ${agentName}`);
            return {
                success: false,
                action: 'error',
                error: `Unknown agent: ${agentName}`,
            };
        }

        try {
            const result = await agent.execute(input, context);
            const duration = Date.now() - startTime;

            this.logger.log(`✅ [AGENT_COMPLETE] Agent: ${agentName} | Success: ${result.success} | Duration: ${duration}ms`);
            this.logger.debug(`📤 [AGENT_OUTPUT] Agent: ${agentName} | Action: ${result.action} | Reasoning: ${result.reasoning?.substring(0, 200)}`);

            // Log the agent action
            if (context.leadId) {
                await this.logAgentAction(context.leadId, agentName, result);
            }

            // If agent specifies a next agent, queue it
            if (result.success && result.nextAgent) {
                this.logger.log(`🔄 [AGENT_HANDOFF] From: ${agentName} -> To: ${result.nextAgent} | Lead: ${context.leadId}`);
                await this.agentQueue.add('agent-handoff', {
                    agent: result.nextAgent,
                    input: result.data,
                    context,
                });
            }

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`❌ [AGENT_FAILED] Agent: ${agentName} | Duration: ${duration}ms | Error: ${error instanceof Error ? error.message : 'Unknown'}`);
            this.logger.error(`Agent ${agentName} failed:`, error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get the coordinator's recommendation for a lead
     */
    async getRecommendation(leadId: string): Promise<AgentResult> {
        this.logger.log(`📋 [RECOMMENDATION_START] Lead: ${leadId}`);
        const startTime = Date.now();

        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                activities: { take: 10, orderBy: { createdAt: 'desc' } },
                meetings: { take: 5 },
                communications: { take: 10, orderBy: { createdAt: 'desc' } },
            },
        });

        if (!lead) {
            this.logger.warn(`⚠️ [RECOMMENDATION_FAILED] Lead not found: ${leadId}`);
            return { success: false, action: 'error', error: 'Lead not found' };
        }

        this.logger.debug(`📊 [RECOMMENDATION_DATA] Lead: ${leadId} | Activities: ${lead.activities.length} | Meetings: ${lead.meetings.length} | Communications: ${lead.communications.length}`);

        const result = await this.coordinatorAgent.execute(lead, { leadId });
        const duration = Date.now() - startTime;
        this.logger.log(`📋 [RECOMMENDATION_COMPLETE] Lead: ${leadId} | Duration: ${duration}ms | Success: ${result.success}`);
        return result;
    }

    /**
     * Score a lead using the qualification agent
     */
    async scoreLead(leadId: string): Promise<AgentResult> {
        this.logger.log(`🎯 [SCORING_START] Lead: ${leadId}`);
        const startTime = Date.now();

        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            this.logger.warn(`⚠️ [SCORING_FAILED] Lead not found: ${leadId}`);
            return { success: false, action: 'error', error: 'Lead not found' };
        }

        this.logger.debug(`📊 [SCORING_DATA] Lead: ${leadId} | Company: ${lead.companyName} | Current Score: ${lead.score}`);

        const result = await this.qualificationAgent.execute(lead, { leadId });
        const duration = Date.now() - startTime;
        this.logger.log(`🎯 [SCORING_COMPLETE] Lead: ${leadId} | Duration: ${duration}ms | New Score: ${(result.data as any)?.totalScore || 'N/A'}`);
        return result;
    }

    /**
     * Generate a personalized email for a lead
     */
    async generateEmail(leadId: string, type: string): Promise<AgentResult> {
        this.logger.log(`📧 [EMAIL_GEN_START] Lead: ${leadId} | Type: ${type}`);
        const startTime = Date.now();

        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                communications: { take: 5, orderBy: { createdAt: 'desc' } },
            },
        });

        if (!lead) {
            this.logger.warn(`⚠️ [EMAIL_GEN_FAILED] Lead not found: ${leadId}`);
            return { success: false, action: 'error', error: 'Lead not found' };
        }

        this.logger.debug(`📊 [EMAIL_GEN_DATA] Lead: ${leadId} | Previous Emails: ${lead.communications.length}`);

        const result = await this.communicationAgent.execute({ lead, type: type as 'acknowledgment' | 'follow_up' | 'demo_offer' | 'case_study' | 'break_up' | 'custom' }, { leadId });
        const duration = Date.now() - startTime;
        this.logger.log(`📧 [EMAIL_GEN_COMPLETE] Lead: ${leadId} | Type: ${type} | Duration: ${duration}ms | Success: ${result.success}`);
        return result;
    }

    private getAgentByName(name: string) {
        const agents: Record<string, any> = {
            coordinator: this.coordinatorAgent,
            qualification: this.qualificationAgent,
            communication: this.communicationAgent,
            scheduling: this.schedulingAgent,
            research: this.researchAgent,
            document: this.documentAgent,
            analytics: this.analyticsAgent,
        };

        return agents[name.toLowerCase()];
    }

    private async logAgentAction(
        leadId: string,
        agentName: string,
        result: AgentResult,
    ): Promise<void> {
        await this.prisma.activity.create({
            data: {
                leadId,
                type: 'WORKFLOW_TRIGGERED',
                content: `AI Agent: ${agentName} - ${result.action}`,
                metadata: {
                    agent: agentName,
                    action: result.action,
                    reasoning: result.reasoning,
                    success: result.success,
                },
                automated: true,
            },
        });
    }
}
