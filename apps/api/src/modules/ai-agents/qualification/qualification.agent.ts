import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent, AgentContext, AgentResult } from '../base.agent';
import { Lead } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface LeadScore {
    totalScore: number;
    category: 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED';
    confidence: number;
    breakdown: {
        companyFit: number;
        roleLevel: number;
        intent: number;
        engagement: number;
        urgency: number;
    };
    reasoning: string;
    nextStage: string;
}

@Injectable()
export class QualificationAgent extends BaseAgent {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super(
            configService,
            'QualificationAgent',
            `You are the Qualification Agent for TachyHealth's autonomous client onboarding system.
Your role is to score and qualify leads based on their fit for TachyHealth's AI healthcare solutions.

SCORING CRITERIA (0-100 total):

1. COMPANY FIT (0-25 points):
   - Healthcare industry: +15
   - Insurance/Payer: +10
   - Large enterprise (>500 employees): +5
   - Known decision-maker company: +5

2. ROLE LEVEL (0-20 points):
   - C-Level/VP: +20
   - Director: +15
   - Manager: +10
   - Other: +5

3. INTENT SIGNALS (0-25 points):
   - Demo request: +25
   - Pricing inquiry: +20
   - Product questions: +15
   - General inquiry: +10
   - Partnership: +15

4. ENGAGEMENT (0-15 points):
   - Email opens: +5
   - Link clicks: +5
   - Form fills: +5

5. URGENCY (0-15 points):
   - Budget mentioned: +5
   - Timeline mentioned: +5
   - Pain points described: +5

CATEGORIES:
- HOT (80-100): High priority, immediate engagement
- WARM (50-79): Nurture with regular touchpoints
- COLD (20-49): Long-term nurture
- UNQUALIFIED (<20): Not a fit

Analyze the lead and provide a detailed score breakdown.`,
        );
    }

    async execute(input: Lead, context: AgentContext): Promise<AgentResult> {
        this.log('Scoring lead', { leadId: context.leadId });

        const prompt = `
Score this lead for TachyHealth:

LEAD DATA:
- Name: ${input.firstName} ${input.lastName}
- Email: ${input.email}
- Company: ${input.companyName}
- Job Title: ${input.jobTitle || 'Not provided'}
- Industry: ${input.industry || 'Not provided'}
- Phone: ${input.phone || 'Not provided'}
- Country: ${input.country || 'Not provided'}
- Source: ${input.source}

INQUIRY MESSAGE:
${input.originalMessage || 'No message provided'}

PRODUCTS OF INTEREST:
${input.productsOfInterest?.join(', ') || 'Not specified'}

Provide a detailed scoring in JSON format:
{
  "totalScore": 0-100,
  "category": "HOT|WARM|COLD|UNQUALIFIED",
  "confidence": 0-100,
  "breakdown": {
    "companyFit": 0-25,
    "roleLevel": 0-20,
    "intent": 0-25,
    "engagement": 0-15,
    "urgency": 0-15
  },
  "reasoning": "detailed explanation of scoring",
  "nextStage": "recommended pipeline stage"
}`;

        try {
            const score = await this.chatWithJson<LeadScore>(
                [this.createHumanMessage(prompt)],
            );

            this.log('Score calculated', score);

            // Update lead in database
            await this.updateLeadScore(context.leadId!, score);

            return {
                success: true,
                action: `Lead scored: ${score.totalScore}/100 (${score.category})`,
                reasoning: score.reasoning,
                data: score,
                nextAgent: score.category === 'HOT' ? 'communication' : undefined,
            };
        } catch (error) {
            this.log('Error scoring lead', error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Scoring failed',
            };
        }
    }

    private async updateLeadScore(leadId: string, score: LeadScore): Promise<void> {
        // Map category to stage
        const stageMap: Record<string, string> = {
            'HOT': 'HOT_ENGAGED',
            'WARM': 'WARM_NURTURING',
            'COLD': 'COLD_ARCHIVED',
            'UNQUALIFIED': 'DISQUALIFIED',
        };

        await this.prisma.lead.update({
            where: { id: leadId },
            data: {
                score: score.totalScore,
                scoreBreakdown: score.breakdown as any,
                scoreConfidence: score.confidence,
                category: score.category,
                stage: stageMap[score.category] as any,
                aiInsights: {
                    qualification: {
                        scoredAt: new Date().toISOString(),
                        reasoning: score.reasoning,
                        confidence: score.confidence,
                    },
                },
            },
        });

        // Log stage change
        await this.prisma.stageHistory.create({
            data: {
                leadId,
                fromStage: 'QUALIFYING',
                toStage: stageMap[score.category] as any,
                reason: `AI Qualification: Score ${score.totalScore}/100`,
                automated: true,
            },
        });
    }
}
