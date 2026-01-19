import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent, AgentContext, AgentResult } from '../base.agent';
import { PrismaService } from '../../../prisma/prisma.service';

// ============================================
// Types & Interfaces
// ============================================

interface TimeSlot {
    date: string;      // YYYY-MM-DD
    time: string;      // HH:MM
    duration: number;  // minutes
    priority: 'preferred' | 'alternative' | 'fallback';
    score: number;     // 0-100 quality score
    reason: string;    // Why this slot is good/bad
}

interface SchedulingDecision {
    shouldSchedule: boolean;
    urgency: 'immediate' | 'high' | 'normal' | 'low';
    meetingType: 'discovery' | 'demo' | 'technical' | 'closing' | 'follow_up';
    suggestedSlots: TimeSlot[];
    participants: ParticipantSuggestion[];
    agenda: AgendaItem[];
    prepMaterials: PrepMaterial[];
    escalation?: EscalationInfo;
    reasoning: string;
}

interface ParticipantSuggestion {
    role: string;
    required: boolean;
    reason: string;
}

interface AgendaItem {
    topic: string;
    duration: number;
    notes?: string;
}

interface PrepMaterial {
    type: 'case_study' | 'whitepaper' | 'demo_script' | 'competitor_intel' | 'company_news';
    title: string;
    relevance: string;
    url?: string;
}

interface EscalationInfo {
    reason: string;
    escalateTo: 'manager' | 'director' | 'vp_sales';
    priority: 'urgent' | 'high' | 'normal';
}

interface SchedulingInput {
    lead: any;
    action: 'suggest' | 'confirm' | 'reschedule' | 'no_show_follow_up';
    preferredTimes?: string[];
    noShowCount?: number;
    lastMeetingOutcome?: string;
}

interface NoShowAnalysis {
    pattern: 'first_time' | 'repeat_offender' | 'timing_issue';
    riskLevel: 'low' | 'medium' | 'high';
    suggestedAction: string;
    rescheduleStrategy: string;
}

// ============================================
// Industry & Holiday Configuration
// ============================================

const INDUSTRY_PREFERENCES: Record<string, {
    preferredHours: { start: number; end: number };
    preferredDays: number[];
    avoidDays: number[];
    notes: string;
}> = {
    'Healthcare': {
        preferredHours: { start: 7, end: 15 }, // Early morning preferred
        preferredDays: [1, 2, 3, 4],           // Mon-Thu
        avoidDays: [5],                         // Avoid Fridays
        notes: 'Healthcare executives prefer early calls before clinics open',
    },
    'Finance': {
        preferredHours: { start: 8, end: 17 },
        preferredDays: [1, 2, 3, 4],
        avoidDays: [5],                         // Avoid Fridays
        notes: 'Avoid month-end (25th-5th)',
    },
    'Technology': {
        preferredHours: { start: 10, end: 18 }, // Later start
        preferredDays: [1, 2, 3, 4, 5],
        avoidDays: [],
        notes: 'Tech is flexible, but avoid Monday mornings',
    },
    'Insurance': {
        preferredHours: { start: 9, end: 16 },
        preferredDays: [2, 3, 4],               // Tue-Thu
        avoidDays: [1, 5],                      // Avoid Mon/Fri
        notes: 'Mid-week preferred for decision makers',
    },
    'default': {
        preferredHours: { start: 9, end: 17 },
        preferredDays: [1, 2, 3, 4, 5],
        avoidDays: [],
        notes: 'Standard business hours',
    },
};

const COUNTRY_HOLIDAYS: Record<string, string[]> = {
    'US': ['2026-01-01', '2026-01-20', '2026-02-17', '2026-05-25', '2026-07-04', '2026-09-07', '2026-11-26', '2026-12-25'],
    'UK': ['2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25', '2026-08-31', '2026-12-25', '2026-12-28'],
    'CA': ['2026-01-01', '2026-02-17', '2026-04-03', '2026-05-18', '2026-07-01', '2026-09-07', '2026-10-12', '2026-12-25'],
    'AU': ['2026-01-01', '2026-01-26', '2026-04-03', '2026-04-06', '2026-04-25', '2026-06-08', '2026-12-25', '2026-12-28'],
};

// ============================================
// Enhanced Scheduling Agent
// ============================================

@Injectable()
export class SchedulingAgent extends BaseAgent {
    private readonly logger = new Logger(SchedulingAgent.name);

    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super(
            configService,
            'SchedulingAgent',
            `You are an ADVANCED Scheduling Agent for TachyHealth's autonomous client onboarding system.
Your role is to intelligently coordinate and optimize meeting scheduling for maximum conversion.

CORE CAPABILITIES:
1. Smart Time Optimization - Consider timezone, industry norms, and historical patterns
2. Priority-Based Urgency - Hot leads get immediate attention
3. No-Show Recovery - Intelligent reschedule strategies
4. Meeting Prep - Personalized materials and talking points
5. Multi-Stakeholder Coordination - Include right participants

MEETING TYPES & DURATIONS:
- Discovery Call (30 min): Initial exploration, score 60-70
- Product Demo (45 min): Score 70-80, ready to see product
- Technical Deep-Dive (60 min): Score 80+, has technical stakeholders
- Closing Meeting (30 min): Score 85+, ready for proposal
- Follow-Up (15-30 min): Post-demo clarification

URGENCY RULES:
- Score 90+: IMMEDIATE - Schedule within 24 hours
- Score 80-89: HIGH - Schedule within 48 hours
- Score 70-79: NORMAL - Schedule within 3-5 days
- Score <70: LOW - Schedule within 7 days

TIME OPTIMIZATION:
- ALWAYS respect the lead's local timezone
- Consider industry-specific preferences
- Avoid holidays in the lead's country
- Mid-week (Tue-Thu) has highest conversion rates
- Morning slots (9-11 AM local) have best show rates
- Add 15-minute buffer before important meetings

NO-SHOW HANDLING:
- First no-show: Friendly reschedule, offer multiple times
- Second no-show: Shorter meeting, stronger CTA
- Third no-show: Reduce priority, suggest async demo

PREP MATERIALS TO SUGGEST:
- Healthcare leads: Compliance case studies, HIPAA docs
- Insurance leads: Claims processing ROI calculator
- Technical roles: Architecture diagrams, security docs
- C-level: Executive summary, ROI projections

OUTPUT HIGH-QUALITY SCHEDULING DECISIONS.`,
        );
    }

    async execute(input: SchedulingInput, context: AgentContext): Promise<AgentResult> {
        this.log(`Scheduling action: ${input.action}`, { leadId: context.leadId });

        const { lead, action } = input;

        // Get historical data for this lead
        const historicalData = await this.getLeadHistory(context.leadId!);

        // Get industry preferences
        const industryPrefs = this.getIndustryPreferences(lead.industry);

        // Check for holidays
        const holidaysToAvoid = this.getHolidays(lead.country);

        // Build enhanced prompt with all context
        const prompt = this.buildEnhancedPrompt(lead, action, historicalData, industryPrefs, holidaysToAvoid, input);

        try {
            const decision = await this.chatWithJson<SchedulingDecision>(
                [this.createHumanMessage(prompt)],
            );

            this.log('Scheduling decision', {
                urgency: decision.urgency,
                meetingType: decision.meetingType,
                slotsCount: decision.suggestedSlots.length,
            });

            // Handle escalation if needed
            if (decision.escalation) {
                await this.handleEscalation(context.leadId!, decision.escalation);
            }

            // Log prep materials for sales rep
            if (decision.prepMaterials?.length > 0) {
                await this.logPrepMaterials(context.leadId!, decision.prepMaterials);
            }

            return {
                success: true,
                action: decision.shouldSchedule
                    ? `Suggested ${decision.meetingType} meeting (${decision.urgency} priority)`
                    : 'No meeting needed at this time',
                reasoning: decision.reasoning,
                data: decision,
            };
        } catch (error) {
            this.log('Error in scheduling', error);
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Scheduling failed',
            };
        }
    }

    // ============================================
    // Smart Time Optimization
    // ============================================

    private getIndustryPreferences(industry: string | null) {
        return INDUSTRY_PREFERENCES[industry || 'default'] || INDUSTRY_PREFERENCES['default'];
    }

    private getHolidays(country: string | null): string[] {
        if (!country) return [];
        // Map country names to codes
        const countryCodeMap: Record<string, string> = {
            'United States': 'US', 'USA': 'US', 'US': 'US',
            'United Kingdom': 'UK', 'UK': 'UK', 'GB': 'UK',
            'Canada': 'CA', 'CA': 'CA',
            'Australia': 'AU', 'AU': 'AU',
        };
        const code = countryCodeMap[country] || country.toUpperCase().substring(0, 2);
        return COUNTRY_HOLIDAYS[code] || [];
    }

    // ============================================
    // Lead History & Analytics
    // ============================================

    private async getLeadHistory(leadId: string): Promise<{
        meetingCount: number;
        noShowCount: number;
        lastMeetingDate: Date | null;
        lastMeetingOutcome: string | null;
        communicationCount: number;
        averageResponseTime: number | null;
    }> {
        const meetings = await this.prisma.meeting.findMany({
            where: { leadId },
            orderBy: { startTime: 'desc' },
            take: 10,
        });

        const communications = await this.prisma.communication.findMany({
            where: { leadId, direction: 'INBOUND' },
            take: 20,
        });

        const noShows = meetings.filter(m => m.status === 'NO_SHOW').length;
        const lastMeeting = meetings[0];

        return {
            meetingCount: meetings.length,
            noShowCount: noShows,
            lastMeetingDate: lastMeeting?.startTime || null,
            lastMeetingOutcome: lastMeeting?.outcome || null,
            communicationCount: communications.length,
            averageResponseTime: this.calculateAverageResponseTime(communications),
        };
    }

    private calculateAverageResponseTime(communications: any[]): number | null {
        if (communications.length < 2) return null;
        // Simplified calculation - would need more sophisticated logic in production
        return 24; // hours
    }

    // ============================================
    // Escalation Handling
    // ============================================

    private async handleEscalation(leadId: string, escalation: EscalationInfo): Promise<void> {
        this.logger.warn(`Escalation triggered for lead ${leadId}: ${escalation.reason}`);

        await this.prisma.activity.create({
            data: {
                leadId,
                type: 'WORKFLOW_TRIGGERED',
                content: `⚠️ ESCALATION: ${escalation.reason} - Escalate to ${escalation.escalateTo}`,
                automated: true,
                metadata: JSON.parse(JSON.stringify({ escalation })),
            },
        });
    }

    // ============================================
    // Prep Materials Logging
    // ============================================

    private async logPrepMaterials(leadId: string, materials: PrepMaterial[]): Promise<void> {
        await this.prisma.activity.create({
            data: {
                leadId,
                type: 'NOTE_ADDED',
                content: `📋 Meeting Prep Materials:\n${materials.map(m => `• ${m.type}: ${m.title}`).join('\n')}`,
                automated: true,
                metadata: JSON.parse(JSON.stringify({ prepMaterials: materials })),
            },
        });
    }

    // ============================================
    // Enhanced Prompt Builder
    // ============================================

    private buildEnhancedPrompt(
        lead: any,
        action: string,
        history: any,
        industryPrefs: any,
        holidays: string[],
        input: SchedulingInput,
    ): string {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Calculate urgency from score
        const scoreUrgency = lead.score >= 90 ? 'IMMEDIATE'
            : lead.score >= 80 ? 'HIGH'
                : lead.score >= 70 ? 'NORMAL' : 'LOW';

        // Analyze no-show risk
        const noShowRisk = history.noShowCount >= 2 ? 'HIGH'
            : history.noShowCount === 1 ? 'MEDIUM' : 'LOW';

        return `
SCHEDULING REQUEST: ${action.toUpperCase()}
DATE: ${todayStr}

═══════════════════════════════════════════════
LEAD PROFILE
═══════════════════════════════════════════════
Name: ${lead.firstName} ${lead.lastName}
Company: ${lead.companyName}
Role: ${lead.jobTitle || 'Unknown'}
Industry: ${lead.industry || 'Unknown'}
Country: ${lead.country || 'Unknown'}
Timezone: ${lead.timezone || 'Unknown (assume US Eastern)'}

SCORING:
- Lead Score: ${lead.score}/100
- Score-Based Urgency: ${scoreUrgency}
- Stage: ${lead.stage}
- Deal Size: ${lead.dealSize || 'Unknown'}

═══════════════════════════════════════════════
HISTORICAL DATA
═══════════════════════════════════════════════
Previous Meetings: ${history.meetingCount}
No-Shows: ${history.noShowCount} (Risk: ${noShowRisk})
Last Meeting: ${history.lastMeetingDate?.toLocaleDateString() || 'Never'}
Last Outcome: ${history.lastMeetingOutcome || 'N/A'}
Response Rate: ${history.communicationCount > 0 ? 'Active' : 'Low engagement'}

═══════════════════════════════════════════════
INDUSTRY PREFERENCES (${lead.industry || 'default'})
═══════════════════════════════════════════════
Preferred Hours: ${industryPrefs.preferredHours.start}:00 - ${industryPrefs.preferredHours.end}:00 (lead's local time)
Preferred Days: ${industryPrefs.preferredDays.map((d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
Avoid Days: ${industryPrefs.avoidDays.length > 0 ? industryPrefs.avoidDays.map((d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') : 'None'}
Notes: ${industryPrefs.notes}

═══════════════════════════════════════════════
HOLIDAYS TO AVOID (${lead.country || 'Unknown'})
═══════════════════════════════════════════════
${holidays.length > 0 ? holidays.filter(h => h >= todayStr && h <= nextWeek).join(', ') || 'None in next 7 days' : 'No holiday data'}

═══════════════════════════════════════════════
SPECIAL HANDLING
═══════════════════════════════════════════════
${action === 'no_show_follow_up' ? `
⚠️ NO-SHOW RECOVERY
This is a no-show follow-up. Previous no-shows: ${input.noShowCount || history.noShowCount}
Strategy:
- First no-show: Friendly reschedule, emphasize value
- Second no-show: Shorter meeting, add urgency
- Third no-show: Suggest async demo or lower priority
` : ''}

${lead.score >= 90 ? `
🔥 HOT LEAD ALERT
Score ${lead.score}/100 requires IMMEDIATE scheduling within 24 hours.
If no slots available, ESCALATE to manager.
` : ''}

═══════════════════════════════════════════════
OUTPUT REQUIRED
═══════════════════════════════════════════════
{
  "shouldSchedule": true/false,
  "urgency": "immediate|high|normal|low",
  "meetingType": "discovery|demo|technical|closing|follow_up",
  "suggestedSlots": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM (in lead's timezone)",
      "duration": minutes,
      "priority": "preferred|alternative|fallback",
      "score": 0-100,
      "reason": "why this slot is good"
    }
  ],
  "participants": [
    {"role": "Sales Rep|Technical SME|Solutions Architect", "required": true/false, "reason": "why needed"}
  ],
  "agenda": [
    {"topic": "topic name", "duration": minutes, "notes": "optional notes"}
  ],
  "prepMaterials": [
    {"type": "case_study|whitepaper|demo_script|competitor_intel|company_news", "title": "material name", "relevance": "why relevant"}
  ],
  "escalation": {
    "reason": "why escalate (only if hot lead can't be scheduled within 24h)",
    "escalateTo": "manager|director|vp_sales",
    "priority": "urgent|high|normal"
  } // or null if no escalation needed,
  "reasoning": "comprehensive explanation of the scheduling decision"
}

Provide 3 time slots with scores. Ensure slots respect industry preferences and avoid holidays.
For hot leads (score 90+), if no immediate slots, trigger escalation.`;
    }
}
