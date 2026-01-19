import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent, AgentContext, AgentResult } from '../base.agent';
import { Lead } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface EnrichmentData {
    company: {
        description?: string;
        industry?: string;
        size?: string;
        revenue?: string;
        founded?: string;
        headquarters?: string;
        website?: string;
        linkedinUrl?: string;
        technologies?: string[];
    };
    person: {
        title?: string;
        seniority?: string;
        department?: string;
        linkedinUrl?: string;
        previousCompanies?: string[];
        education?: string[];
    };
    signals: {
        recentNews?: string[];
        fundingRounds?: string[];
        jobPostings?: string[];
        techStack?: string[];
    };
    insights: {
        potentialPainPoints: string[];
        talkingPoints: string[];
        competitorMentions?: string[];
        recommendedApproach: string;
    };
}

@Injectable()
export class ResearchAgent extends BaseAgent {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super(
            configService,
            'ResearchAgent',
            `You are the Research Agent for TachyHealth's autonomous client onboarding system.
Your role is to enrich lead data with company and person insights.

RESEARCH FOCUS:
1. Company Information: Size, industry, revenue, tech stack
2. Person Details: Role level, department, decision-making power
3. Business Signals: Recent news, funding, growth indicators
4. Sales Insights: Pain points, talking points, approach strategy

ENRICHMENT PRIORITY:
- Healthcare organizations: High priority
- Insurance/Payers: High priority
- Life Sciences: Medium priority
- Other industries: Standard priority

DATA QUALITY:
- Only provide information you're confident about
- Mark uncertain data with confidence level
- Prioritize actionable insights over general info

OUTPUT FORMAT:
Provide structured enrichment data that can be stored and used by sales reps.`,
        );
    }

    async execute(input: Lead, context: AgentContext): Promise<AgentResult> {
        this.log('Researching lead', { leadId: context.leadId });

        const prompt = `
Research and enrich this lead with relevant business intelligence:

CURRENT LEAD DATA:
- Name: ${input.firstName} ${input.lastName}
- Email: ${input.email}
- Company: ${input.companyName}
- Job Title: ${input.jobTitle || 'Not provided'}
- Industry: ${input.industry || 'Not provided'}
- Country: ${input.country || 'Not provided'}
- Website: ${input.companyDomain || 'Not provided'}

Based on the company name, email domain, job title, and any other available signals,
provide enriched data. Use your knowledge to infer reasonable values, but be honest
about confidence levels.

Respond with JSON:
{
  "company": {
    "description": "brief company description",
    "industry": "specific industry",
    "size": "employee count range",
    "revenue": "estimated revenue range",
    "founded": "year if known",
    "headquarters": "city, country",
    "website": "company website",
    "linkedinUrl": "company LinkedIn URL if known",
    "technologies": ["relevant tech they likely use"]
  },
  "person": {
    "title": "refined job title",
    "seniority": "C-Level|VP|Director|Manager|Individual Contributor",
    "department": "department name",
    "linkedinUrl": "person LinkedIn if inferable",
    "previousCompanies": ["if known"],
    "education": ["if known"]
  },
  "signals": {
    "recentNews": ["relevant news items"],
    "fundingRounds": ["if applicable"],
    "jobPostings": ["relevant job postings that indicate needs"],
    "techStack": ["technologies they use"]
  },
  "insights": {
    "potentialPainPoints": ["specific pain points they might have"],
    "talkingPoints": ["points to bring up in conversation"],
    "competitorMentions": ["competitors they might use"],
    "recommendedApproach": "how to approach this lead"
  }
}`;

        try {
            const enrichment = await this.chatWithJson<EnrichmentData>(
                [this.createHumanMessage(prompt)],
            );

            this.log('Enrichment complete', enrichment);

            // Update lead with enrichment data
            await this.updateLeadEnrichment(context.leadId!, enrichment);

            return {
                success: true,
                action: 'Lead enriched with company and person data',
                reasoning: enrichment.insights.recommendedApproach,
                data: enrichment,
                nextAgent: 'qualification',
            };
        } catch (error) {
            this.log('Error enriching lead', error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Enrichment failed',
            };
        }
    }

    private async updateLeadEnrichment(leadId: string, data: EnrichmentData): Promise<void> {
        await this.prisma.lead.update({
            where: { id: leadId },
            data: {
                enrichedData: data as any,
                industry: data.company.industry || undefined,
                aiInsights: {
                    research: {
                        enrichedAt: new Date().toISOString(),
                        companySize: data.company.size,
                        painPoints: data.insights.potentialPainPoints,
                        talkingPoints: data.insights.talkingPoints,
                        recommendedApproach: data.insights.recommendedApproach,
                    },
                },
            },
        });
    }
}
