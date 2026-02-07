import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent, AgentContext, AgentResult } from '../base.agent';
import { Lead, Communication } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface EmailContent {
    subject: string;
    body: string;
    callToAction: string;
    tone: string;
    personalization: string[];
}

interface CommunicationInput {
    lead: Lead & { communications?: Communication[] };
    type: 'acknowledgment' | 'follow_up' | 'demo_offer' | 'case_study' | 'break_up' | 'custom';
    customPrompt?: string;
}

@Injectable()
export class CommunicationAgent extends BaseAgent {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super(
            configService,
            'CommunicationAgent',
            `You are the Communication Agent for TachyHealth's autonomous client onboarding system.
Your role is to generate personalized, engaging emails for leads at various stages.

TACHYHEALTH PRODUCTS:
- AiReview: AI-powered claims review and processing
- AiAxon: Intelligent healthcare data analysis
- RMS: Revenue Management System

COMMUNICATION GUIDELINES:
1. Be professional but warm and approachable
2. Personalize based on lead's industry, role, and interests
3. Focus on value and outcomes, not features
4. Include clear call-to-action
5. Keep emails concise (150-250 words)
6. Use the lead's first name
7. Reference their specific pain points when known

EMAIL TYPES:
- acknowledgment: Thank for inquiry, set expectations (within 5 min)
- follow_up: Check in after no response (2-3 days later)
- demo_offer: Invite to product demo with calendar link
- case_study: Share relevant success story
- break_up: Final attempt after no engagement

SIGNATURE:
Best regards,
TachyHealth Team
www.tachyhealth.com`,
        );
    }

    async execute(input: CommunicationInput | any, context: AgentContext): Promise<AgentResult> {
        // Handle agent-handoff case where input doesn't have lead object
        let lead = input?.lead;
        let type = input?.type || 'follow_up'; // Default to follow_up for handoffs

        // If no lead in input, fetch from database
        if (!lead && context.leadId) {
            lead = await this.prisma.lead.findUnique({
                where: { id: context.leadId },
                include: { communications: { take: 5, orderBy: { createdAt: 'desc' } } },
            });
        }

        if (!lead) {
            return {
                success: false,
                action: 'error',
                error: 'Lead not found',
            };
        }

        this.log(`Generating ${type} email`, { leadId: context.leadId });

        const previousEmails = lead.communications?.slice(0, 3) || [];

        const prompt = this.buildPrompt(lead, type, previousEmails, input?.customPrompt);

        try {
            const email = await this.chatWithJson<EmailContent>(
                [this.createHumanMessage(prompt)],
            );

            this.log('Email generated', { subject: email.subject });

            return {
                success: true,
                action: `Generated ${type} email`,
                reasoning: `Email personalized with: ${email.personalization.join(', ')}`,
                data: {
                    subject: email.subject,
                    body: email.body,
                    callToAction: email.callToAction,
                    tone: email.tone,
                    personalization: email.personalization,
                    type,
                },
            };
        } catch (error) {
            this.log('Error generating email', error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Email generation failed',
            };
        }
    }

    private buildPrompt(
        lead: Lead,
        type: string,
        previousEmails: Communication[],
        customPrompt?: string,
    ): string {
        const typeInstructions: Record<string, string> = {
            acknowledgment: `Write a warm acknowledgment email thanking them for reaching out. 
Set expectation that a specialist will follow up within 24 hours.
Express genuine interest in helping solve their challenges.`,

            follow_up: `Write a friendly follow-up email.
Reference their original inquiry naturally.
Offer additional value (resource, insight, or question to engage).`,

            demo_offer: `Write a compelling demo invitation email.
Highlight 2-3 key benefits relevant to their role/industry.
Include urgency without being pushy.
Mention that the demo is personalized to their needs.`,

            case_study: `Write an email sharing a relevant case study.
Choose an example from healthcare or their industry.
Focus on measurable outcomes (%, time saved, ROI).
Connect it to their likely pain points.`,

            break_up: `Write a respectful "break up" email.
Acknowledge they may be busy.
Leave the door open for future contact.
Keep it short and professional.`,

            custom: customPrompt || 'Write a professional outreach email.',
        };

        return `
Generate a personalized email for this lead:

LEAD INFORMATION:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.companyName}
- Role: ${lead.jobTitle || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Email: ${lead.email}

ORIGINAL INQUIRY:
${lead.originalMessage || 'General website inquiry'}

PRODUCTS OF INTEREST:
${lead.productsOfInterest?.join(', ') || 'General interest'}

CURRENT SCORE: ${lead.score}/100

PREVIOUS COMMUNICATIONS (${previousEmails.length}):
${previousEmails.map(e => `- ${e.subject || 'No subject'}`).join('\n') || 'None'}

EMAIL TYPE: ${type}
INSTRUCTIONS: ${typeInstructions[type]}

Respond with JSON:
{
  "subject": "compelling email subject line",
  "body": "full email body with proper formatting and paragraphs",
  "callToAction": "the specific action you want them to take",
  "tone": "professional|friendly|urgent|casual",
  "personalization": ["list of personalization elements used"]
}`;
    }
}
