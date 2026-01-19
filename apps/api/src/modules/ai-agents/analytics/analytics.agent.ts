import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent, AgentContext, AgentResult } from '../base.agent';
import { Lead, Activity } from '@prisma/client';

interface AnalyticsInsights {
    leadHealth: {
        score: number;
        trend: 'improving' | 'stable' | 'declining';
        riskLevel: 'low' | 'medium' | 'high';
    };
    engagement: {
        emailOpenRate: number;
        responseRate: number;
        meetingAttendance: number;
        lastEngagement: string;
    };
    predictions: {
        conversionProbability: number;
        estimatedDealSize: string;
        expectedCloseDate: string;
        confidence: number;
    };
    recommendations: {
        immediate: string[];
        shortTerm: string[];
        risks: string[];
    };
    benchmarks: {
        comparedToAverage: string;
        percentile: number;
    };
}

interface AnalyticsInput {
    lead: Lead & { activities?: Activity[] };
    type: 'lead_analysis' | 'pipeline_forecast' | 'engagement_report';
}

@Injectable()
export class AnalyticsAgent extends BaseAgent {
    constructor(configService: ConfigService) {
        super(
            configService,
            'AnalyticsAgent',
            `You are the Analytics Agent for TachyHealth's autonomous client onboarding system.
Your role is to analyze leads, predict outcomes, and provide actionable insights.

ANALYSIS CAPABILITIES:
1. Lead Health Assessment: Overall lead quality and trajectory
2. Engagement Metrics: Email opens, clicks, responses, meeting attendance
3. Conversion Prediction: Likelihood to convert, deal size, timeline
4. Risk Identification: Churn signals, objections, competitor threats
5. Recommendations: Immediate and short-term actions

BENCHMARKS (TachyHealth averages):
- Average lead score: 55/100
- Email open rate: 28%
- Response rate: 12%
- Discovery to demo conversion: 40%
- Demo to proposal conversion: 60%
- Proposal to close rate: 35%
- Average sales cycle: 45 days
- Average deal size: $180,000/year

Your analysis should be data-driven and actionable.`,
        );
    }

    async execute(input: AnalyticsInput, context: AgentContext): Promise<AgentResult> {
        this.log(`Running ${input.type} analysis`, { leadId: context.leadId });

        const { lead, type } = input;

        const prompt = this.buildPrompt(lead, type);

        try {
            const insights = await this.chatWithJson<AnalyticsInsights>(
                [this.createHumanMessage(prompt)],
            );

            this.log('Analysis complete', insights);

            return {
                success: true,
                action: `${type} analysis completed`,
                reasoning: `Lead is ${insights.leadHealth.trend} with ${insights.predictions.conversionProbability}% conversion probability`,
                data: insights,
            };
        } catch (error) {
            this.log('Error in analysis', error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Analysis failed',
            };
        }
    }

    private buildPrompt(lead: Lead & { activities?: Activity[] }, type: string): string {
        const activities = lead.activities || [];
        const activitySummary = activities.slice(0, 20).map(a =>
            `- ${a.type}: ${a.content || 'No details'} (${new Date(a.createdAt).toLocaleDateString()})`
        ).join('\n');

        return `
Perform ${type.replace('_', ' ')} for this lead:

LEAD PROFILE:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.companyName}
- Role: ${lead.jobTitle || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Country: ${lead.country || 'Unknown'}

PIPELINE STATUS:
- Stage: ${lead.stage}
- Score: ${lead.score}/100
- Created: ${new Date(lead.createdAt).toLocaleDateString()}
- Days in Pipeline: ${Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}

ACTIVITY HISTORY (${activities.length} total):
${activitySummary || 'No activities recorded'}

PRODUCTS OF INTEREST:
${lead.productsOfInterest?.join(', ') || 'Not specified'}

Provide comprehensive analysis:

{
  "leadHealth": {
    "score": 0-100,
    "trend": "improving|stable|declining",
    "riskLevel": "low|medium|high"
  },
  "engagement": {
    "emailOpenRate": 0-100,
    "responseRate": 0-100,
    "meetingAttendance": 0-100,
    "lastEngagement": "description of last activity"
  },
  "predictions": {
    "conversionProbability": 0-100,
    "estimatedDealSize": "$XXX,XXX/year",
    "expectedCloseDate": "YYYY-MM-DD or timeframe",
    "confidence": 0-100
  },
  "recommendations": {
    "immediate": ["action to take now"],
    "shortTerm": ["actions for next 1-2 weeks"],
    "risks": ["potential risks to address"]
  },
  "benchmarks": {
    "comparedToAverage": "above|at|below average",
    "percentile": 0-100
  }
}`;
    }
}
