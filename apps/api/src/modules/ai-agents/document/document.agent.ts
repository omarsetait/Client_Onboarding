import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent, AgentContext, AgentResult } from '../base.agent';
import { Lead } from '@prisma/client';

interface ProposalContent {
    title: string;
    executiveSummary: string;
    sections: {
        name: string;
        content: string;
    }[];
    pricing: {
        tier: string;
        monthlyPrice: string;
        annualPrice: string;
        features: string[];
    }[];
    timeline: {
        phase: string;
        duration: string;
        deliverables: string[];
    }[];
    terms: string[];
}

interface DocumentInput {
    lead: Lead;
    type: 'proposal' | 'contract' | 'sow' | 'nda';
    customization?: string;
}

@Injectable()
export class DocumentAgent extends BaseAgent {
    constructor(configService: ConfigService) {
        super(
            configService,
            'DocumentAgent',
            `You are the Document Agent for TachyHealth's autonomous client onboarding system.
Your role is to generate professional sales documents.

TACHYHEALTH PRODUCTS:
1. AiReview - AI-powered claims review ($5,000-$50,000/month based on volume)
2. AiAxon - Healthcare analytics platform ($3,000-$25,000/month)
3. RMS - Revenue Management System ($2,000-$15,000/month)

DOCUMENT TYPES:
- Proposal: Comprehensive solution overview with pricing
- Contract: Service agreement with terms
- SOW: Detailed scope of work for implementation
- NDA: Non-disclosure agreement for demos

WRITING GUIDELINES:
- Professional but accessible tone
- Industry-specific terminology for healthcare
- Clear value propositions and ROI
- HIPAA and compliance focus
- Implementation timeline and support details`,
        );
    }

    async execute(input: DocumentInput, context: AgentContext): Promise<AgentResult> {
        this.log(`Generating ${input.type} document`, { leadId: context.leadId });

        const { lead, type } = input;

        const prompt = this.buildPrompt(lead, type);

        try {
            const document = await this.chatWithJson<ProposalContent>(
                [this.createHumanMessage(prompt)],
            );

            this.log('Document generated', { title: document.title });

            return {
                success: true,
                action: `Generated ${type} for ${lead.companyName}`,
                reasoning: `Document customized for ${lead.industry || 'healthcare'} industry`,
                data: document,
            };
        } catch (error) {
            this.log('Error generating document', error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Document generation failed',
            };
        }
    }

    private buildPrompt(lead: Lead, type: string): string {
        return `
Generate a ${type.toUpperCase()} document for this prospect:

COMPANY: ${lead.companyName}
CONTACT: ${lead.firstName} ${lead.lastName} (${lead.jobTitle || 'Decision Maker'})
INDUSTRY: ${lead.industry || 'Healthcare'}
SIZE: ${(lead.enrichedData as any)?.company?.size || 'Unknown'}

PRODUCTS OF INTEREST:
${lead.productsOfInterest?.join(', ') || 'All products'}

ORIGINAL INQUIRY:
${lead.originalMessage || 'General interest in TachyHealth solutions'}

Create a professional ${type} with the following structure:

{
  "title": "Document title including company name",
  "executiveSummary": "2-3 paragraph executive summary",
  "sections": [
    {"name": "Section Name", "content": "Section content with details"}
  ],
  "pricing": [
    {
      "tier": "Starter|Professional|Enterprise",
      "monthlyPrice": "$X,XXX",
      "annualPrice": "$XX,XXX (10% discount)",
      "features": ["included features"]
    }
  ],
  "timeline": [
    {
      "phase": "Phase name",
      "duration": "X weeks",
      "deliverables": ["list of deliverables"]
    }
  ],
  "terms": ["key terms and conditions"]
}`;
    }
}
