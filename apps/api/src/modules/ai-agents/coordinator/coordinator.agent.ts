import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent, AgentContext, AgentResult } from '../base.agent';
import { Lead, Activity, Meeting, Communication } from '@prisma/client';

interface LeadWithRelations extends Lead {
    activities?: Activity[];
    meetings?: Meeting[];
    communications?: Communication[];
}

interface CoordinatorDecision {
    nextAction: string;
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
    agentToInvoke?: string;
    suggestedActions: string[];
}

@Injectable()
export class CoordinatorAgent extends BaseAgent {
    constructor(configService: ConfigService) {
        super(
            configService,
            'CoordinatorAgent',
            `You are the Coordinator Agent for TachyHealth's autonomous client onboarding system.
Your role is to analyze leads and decide the optimal next action in the sales pipeline.

You coordinate between these specialized agents:
- Qualification Agent: Scores and categorizes leads
- Communication Agent: Sends personalized emails
- Scheduling Agent: Books meetings and demos
- Research Agent: Enriches lead data
- Document Agent: Generates proposals and contracts
- Analytics Agent: Provides insights and predictions

Based on the lead's current state, history, and engagement, recommend:
1. The immediate next action
2. Which agent should handle it
3. Priority level (high/medium/low)
4. Your reasoning

Consider factors like:
- Lead score and category (Hot/Warm/Cold)
- Time since last contact
- Engagement level (email opens, clicks, responses)
- Current stage in pipeline
- Business urgency signals`,
        );
    }

    async execute(input: LeadWithRelations, context: AgentContext): Promise<AgentResult> {
        this.log('Analyzing lead for next action', { leadId: context.leadId });

        const leadSummary = this.summarizeLead(input);
        const prompt = `
Analyze this lead and recommend the optimal next action:

${leadSummary}

Respond with JSON:
{
  "nextAction": "description of what to do next",
  "priority": "high|medium|low",
  "reasoning": "why this action is recommended",
  "agentToInvoke": "qualification|communication|scheduling|research|document|analytics",
  "suggestedActions": ["action1", "action2", "action3"]
}`;

        try {
            const decision = await this.chatWithJson<CoordinatorDecision>(
                [this.createHumanMessage(prompt)],
            );

            this.log('Decision made', decision);

            return {
                success: true,
                action: decision.nextAction,
                reasoning: decision.reasoning,
                nextAgent: decision.agentToInvoke,
                data: {
                    priority: decision.priority,
                    suggestedActions: decision.suggestedActions,
                },
            };
        } catch (error) {
            this.log('Error in coordination', error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Coordination failed',
            };
        }
    }

    private summarizeLead(lead: LeadWithRelations): string {
        const daysSinceCreated = Math.floor(
            (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        );

        const lastActivity = lead.activities?.[0];
        const daysSinceLastActivity = lastActivity
            ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : daysSinceCreated;

        return `
LEAD INFORMATION:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.companyName}
- Email: ${lead.email}
- Job Title: ${lead.jobTitle || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}

PIPELINE STATUS:
- Stage: ${lead.stage}
- Score: ${lead.score}/100
- Category: ${lead.score >= 80 ? 'Hot' : lead.score >= 50 ? 'Warm' : 'Cold'}
- Days in Pipeline: ${daysSinceCreated}
- Days Since Last Activity: ${daysSinceLastActivity}

ENGAGEMENT:
- Total Activities: ${lead.activities?.length || 0}
- Meetings: ${lead.meetings?.length || 0}
- Communications: ${lead.communications?.length || 0}

ORIGINAL INQUIRY:
${lead.originalMessage || 'No message provided'}

PRODUCTS OF INTEREST:
${lead.productsOfInterest?.join(', ') || 'Not specified'}
`;
    }
}
