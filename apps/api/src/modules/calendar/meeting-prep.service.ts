import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * MeetingPrepService
 * 
 * Automatically generates personalized meeting preparation materials for sales reps.
 * Features:
 * - Company news and recent developments
 * - Relevant case studies based on industry
 * - Competitor intelligence
 * - Personalized talking points
 * - Risk factors and objection handling
 */

interface PrepPackage {
    lead: {
        name: string;
        company: string;
        role: string;
        industry: string;
    };
    meeting: {
        type: string;
        date: string;
        duration: number;
    };
    companyInsights: CompanyInsight[];
    talkingPoints: TalkingPoint[];
    caseStudies: CaseStudy[];
    competitorIntel: CompetitorInfo[];
    riskFactors: RiskFactor[];
    suggestedAgenda: AgendaItem[];
}

interface CompanyInsight {
    type: 'news' | 'funding' | 'expansion' | 'leadership' | 'partnership';
    title: string;
    summary: string;
    date?: string;
    relevance: string;
}

interface TalkingPoint {
    topic: string;
    keyMessage: string;
    supportingData?: string;
    potentialObjection?: string;
    objectionResponse?: string;
}

interface CaseStudy {
    title: string;
    industry: string;
    companySize: string;
    challenge: string;
    solution: string;
    results: string;
    relevanceScore: number;
    url?: string;
}

interface CompetitorInfo {
    name: string;
    likelyUsing: boolean;
    strengths: string[];
    weaknesses: string[];
    ourAdvantage: string;
}

interface RiskFactor {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
}

interface AgendaItem {
    topic: string;
    duration: number;
    notes: string;
}

// ============================================
// Case Study Database (would be from CMS in production)
// ============================================

const CASE_STUDIES: CaseStudy[] = [
    {
        title: 'Memorial Health System: 40% Faster Claims Processing',
        industry: 'Healthcare',
        companySize: 'Large',
        challenge: 'Complex claims taking 45+ days to process',
        solution: 'AiReview automated claims validation',
        results: '40% faster processing, $2.3M annual savings',
        relevanceScore: 95,
        url: 'https://tachyhealth.com/cases/memorial-health',
    },
    {
        title: 'BlueCross Regional: AI-Powered Claims Accuracy',
        industry: 'Insurance',
        companySize: 'Large',
        challenge: '15% claims denial rate, manual review backlog',
        solution: 'AiReview + AiAxon analytics',
        results: '70% reduction in denials, 3x faster reviews',
        relevanceScore: 90,
        url: 'https://tachyhealth.com/cases/bluecross-regional',
    },
    {
        title: 'Midwest Medical Group: RMS Implementation',
        industry: 'Healthcare',
        companySize: 'Medium',
        challenge: 'Revenue leakage from missed charges',
        solution: 'Revenue Management System (RMS)',
        results: '$1.8M recovered revenue in first year',
        relevanceScore: 85,
        url: 'https://tachyhealth.com/cases/midwest-medical',
    },
    {
        title: 'TechHealth Startup: Rapid Scaling',
        industry: 'Technology',
        companySize: 'Small',
        challenge: 'Needed healthcare compliance without large team',
        solution: 'Full TachyHealth platform',
        results: 'Achieved HIPAA compliance in 30 days',
        relevanceScore: 75,
        url: 'https://tachyhealth.com/cases/techhealth',
    },
];

const COMPETITORS: CompetitorInfo[] = [
    {
        name: 'Olive',
        likelyUsing: false,
        strengths: ['Well-funded', 'Strong marketing'],
        weaknesses: ['Complex implementation', 'Higher cost', 'Limited customization'],
        ourAdvantage: 'Faster time-to-value, lower TCO, healthcare-specific AI',
    },
    {
        name: 'Waystar',
        likelyUsing: false,
        strengths: ['Established player', 'Large customer base'],
        weaknesses: ['Legacy architecture', 'Slow innovation', 'Complex pricing'],
        ourAdvantage: 'Modern AI, faster processing, better ROI',
    },
    {
        name: 'Change Healthcare',
        likelyUsing: false,
        strengths: ['Comprehensive suite', 'Industry relationships'],
        weaknesses: ['Recent security issues', 'Monolithic platform'],
        ourAdvantage: 'Security-first architecture, modular approach, faster updates',
    },
];

@Injectable()
export class MeetingPrepService {
    private readonly logger = new Logger(MeetingPrepService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Generate a complete prep package for an upcoming meeting
     */
    async generatePrepPackage(meetingId: string): Promise<PrepPackage | null> {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                lead: true,
            },
        });

        if (!meeting || !meeting.lead) {
            this.logger.warn(`Meeting ${meetingId} not found`);
            return null;
        }

        const lead = meeting.lead;

        // Get enriched data if available
        const enrichedData = (lead.enrichedData as any) || {};
        const aiInsights = (lead.aiInsights as any) || {};

        // Generate each component of the prep package
        const companyInsights = this.getCompanyInsights(lead, enrichedData);
        const talkingPoints = this.generateTalkingPoints(lead, meeting.meetingType);
        const caseStudies = this.getRelevantCaseStudies(lead.industry);
        const competitorIntel = this.getCompetitorIntel(enrichedData);
        const riskFactors = this.assessRiskFactors(lead);
        const suggestedAgenda = this.generateAgenda(meeting.meetingType, lead);

        const prepPackage: PrepPackage = {
            lead: {
                name: `${lead.firstName} ${lead.lastName}`,
                company: lead.companyName,
                role: lead.jobTitle || 'Unknown',
                industry: lead.industry || 'Healthcare',
            },
            meeting: {
                type: meeting.meetingType,
                date: meeting.startTime.toISOString(),
                duration: Math.round((meeting.endTime.getTime() - meeting.startTime.getTime()) / 60000),
            },
            companyInsights,
            talkingPoints,
            caseStudies,
            competitorIntel,
            riskFactors,
            suggestedAgenda,
        };

        // Save prep package to meeting metadata
        await this.prisma.meeting.update({
            where: { id: meetingId },
            data: {
                agenda: JSON.stringify(suggestedAgenda),
            },
        });

        // Log as activity
        await this.prisma.activity.create({
            data: {
                leadId: lead.id,
                type: 'NOTE_ADDED',
                content: `📋 Meeting prep package generated for ${meeting.title}`,
                automated: true,
                metadata: JSON.parse(JSON.stringify({ prepPackage })),
            },
        });

        this.logger.log(`Generated prep package for meeting ${meetingId}`);

        return prepPackage;
    }

    private getCompanyInsights(lead: any, enrichedData: any): CompanyInsight[] {
        const insights: CompanyInsight[] = [];

        // Pull from enriched data signals
        if (enrichedData.signals?.recentNews) {
            for (const news of enrichedData.signals.recentNews.slice(0, 2)) {
                insights.push({
                    type: 'news',
                    title: news,
                    summary: news,
                    relevance: 'Recent activity shows company is engaged in market',
                });
            }
        }

        if (enrichedData.signals?.fundingRounds) {
            for (const funding of enrichedData.signals.fundingRounds.slice(0, 1)) {
                insights.push({
                    type: 'funding',
                    title: funding,
                    summary: funding,
                    relevance: 'Recent funding indicates budget availability',
                });
            }
        }

        // Add company size insight if available
        if (enrichedData.company?.size) {
            insights.push({
                type: 'expansion',
                title: `Company Size: ${enrichedData.company.size}`,
                summary: `${lead.companyName} has approximately ${enrichedData.company.size} employees`,
                relevance: 'Size affects implementation scope and pricing tier',
            });
        }

        // Default insight if no enriched data
        if (insights.length === 0) {
            insights.push({
                type: 'news',
                title: `${lead.companyName} Overview`,
                summary: `Research ${lead.companyName} before the call for recent updates`,
                relevance: 'Manual research recommended',
            });
        }

        return insights;
    }

    private generateTalkingPoints(lead: any, meetingType: string): TalkingPoint[] {
        const points: TalkingPoint[] = [];
        const aiInsights = (lead.aiInsights as any) || {};

        // Industry-specific talking points
        if (lead.industry === 'Healthcare') {
            points.push({
                topic: 'Claims Processing Efficiency',
                keyMessage: 'TachyHealth reduces claims processing time by up to 40%',
                supportingData: 'Average customer sees ROI within 6 months',
                potentialObjection: 'We already have a claims system',
                objectionResponse: 'TachyHealth integrates with existing systems—we augment, not replace',
            });
            points.push({
                topic: 'HIPAA Compliance',
                keyMessage: 'Built from the ground up for healthcare compliance',
                supportingData: 'SOC 2 Type II certified, HIPAA compliant',
                potentialObjection: 'Concerned about patient data security',
                objectionResponse: 'We can share our security documentation and compliance certifications',
            });
        } else if (lead.industry === 'Insurance') {
            points.push({
                topic: 'Claims Accuracy',
                keyMessage: 'AI-powered claim validation reduces denials by 70%',
                supportingData: 'Our insurance customers average 3x faster claim processing',
                potentialObjection: 'How does AI improve accuracy?',
                objectionResponse: 'Our AI learns from millions of claims to identify issues before submission',
            });
        }

        // Role-specific talking points
        if (lead.jobTitle?.toLowerCase().includes('cio') || lead.jobTitle?.toLowerCase().includes('tech')) {
            points.push({
                topic: 'Integration Capabilities',
                keyMessage: 'Modern REST API with pre-built connectors',
                supportingData: 'Typical integration takes 2-4 weeks',
                potentialObjection: 'Integration with legacy systems?',
                objectionResponse: 'We have connectors for Epic, Cerner, and most major EHR/ERM systems',
            });
        }

        if (lead.jobTitle?.toLowerCase().includes('cfo') || lead.jobTitle?.toLowerCase().includes('finance')) {
            points.push({
                topic: 'ROI and Cost Savings',
                keyMessage: 'Average customer sees $500K+ annual savings',
                supportingData: 'Typical payback period is 4-6 months',
                potentialObjection: "What is the total cost of ownership?",
                objectionResponse: "We offer transparent pricing with no hidden fees—I can share a TCO analysis",
            });
        }

        // Add pain points from AI insights
        if (aiInsights.research?.painPoints) {
            for (const painPoint of aiInsights.research.painPoints.slice(0, 2)) {
                points.push({
                    topic: 'Identified Pain Point',
                    keyMessage: `Address: ${painPoint}`,
                    supportingData: 'From lead research',
                });
            }
        }

        // Default points for any meeting
        if (points.length < 3) {
            points.push({
                topic: 'Why TachyHealth',
                keyMessage: 'Purpose-built for healthcare with AI-first architecture',
                supportingData: 'Trusted by 200+ healthcare organizations',
            });
        }

        return points;
    }

    private getRelevantCaseStudies(industry: string | null): CaseStudy[] {
        // Filter and sort case studies by relevance
        return CASE_STUDIES
            .filter(cs => !industry || cs.industry === industry || cs.industry === 'Healthcare')
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 2);
    }

    private getCompetitorIntel(enrichedData: any): CompetitorInfo[] {
        const techStack = enrichedData.signals?.techStack || [];

        // Check if any competitors are in their tech stack
        return COMPETITORS.map(comp => ({
            ...comp,
            likelyUsing: techStack.some((tech: string) =>
                tech.toLowerCase().includes(comp.name.toLowerCase())
            ),
        }));
    }

    private assessRiskFactors(lead: any): RiskFactor[] {
        const risks: RiskFactor[] = [];

        // Score-based risks
        if (lead.score < 60) {
            risks.push({
                factor: 'Low lead score',
                severity: 'medium',
                mitigation: 'Focus on qualification—confirm budget, timeline, and decision-making authority',
            });
        }

        // No-show history
        // We would check meeting history here

        // Long sales cycle
        if (lead.stage === 'QUALIFYING' && lead.createdAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
            risks.push({
                factor: 'Extended qualification phase (30+ days)',
                severity: 'medium',
                mitigation: 'Address blockers directly; consider executive sponsorship',
            });
        }

        // C-level but low score
        if (lead.jobTitle?.toLowerCase().includes('chief') && lead.score < 70) {
            risks.push({
                factor: 'C-level contact with engagement concerns',
                severity: 'high',
                mitigation: 'Ensure high-value content; consider bringing sales leadership to call',
            });
        }

        return risks;
    }

    private generateAgenda(meetingType: string, lead: any): AgendaItem[] {
        const agendas: Record<string, AgendaItem[]> = {
            DISCOVERY: [
                { topic: 'Introductions & Rapport Building', duration: 5, notes: 'Learn about their role and priorities' },
                { topic: 'Current Challenges', duration: 10, notes: 'Listen actively, take notes' },
                { topic: 'TachyHealth Overview', duration: 8, notes: 'Tailored to their challenges' },
                { topic: 'Q&A', duration: 5, notes: 'Address concerns' },
                { topic: 'Next Steps', duration: 2, notes: 'Schedule demo if interested' },
            ],
            DEMO: [
                { topic: 'Recap & Objectives', duration: 5, notes: 'Confirm what they want to see' },
                { topic: 'Product Walkthrough', duration: 25, notes: 'Focus on their use cases' },
                { topic: 'Technical Q&A', duration: 10, notes: 'Address integration questions' },
                { topic: 'Pricing Overview', duration: 3, notes: 'High-level, offer detailed proposal' },
                { topic: 'Next Steps', duration: 2, notes: 'Technical deep-dive or proposal?' },
            ],
            TECHNICAL: [
                { topic: 'Architecture Overview', duration: 15, notes: 'API-first, cloud-native' },
                { topic: 'Security & Compliance', duration: 15, notes: 'HIPAA, SOC 2, encryption' },
                { topic: 'Integration Discussion', duration: 20, notes: 'Their specific systems' },
                { topic: 'Implementation Timeline', duration: 8, notes: 'Typical 6-8 weeks' },
                { topic: 'Q&A', duration: 2, notes: 'Technical validations' },
            ],
            CLOSING: [
                { topic: 'Proposal Review', duration: 10, notes: 'Walk through key points' },
                { topic: 'Address Concerns', duration: 10, notes: 'Final objections' },
                { topic: 'Terms Discussion', duration: 5, notes: 'Contract flexibility' },
                { topic: 'Next Steps', duration: 5, notes: 'Signature timeline' },
            ],
            FOLLOW_UP: [
                { topic: 'Check-in', duration: 5, notes: 'How are things going?' },
                { topic: 'Address Open Items', duration: 15, notes: 'From previous meeting' },
                { topic: 'Next Steps', duration: 5, notes: 'What do they need?' },
            ],
        };

        return agendas[meetingType] || agendas['DISCOVERY'];
    }
}
