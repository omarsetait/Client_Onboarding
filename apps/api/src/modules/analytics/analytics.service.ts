import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadStage, MeetingStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get lead distribution across stages with conversion rates
     */
    async getFunnelMetrics() {
        // Define the funnel stages in order
        const stageOrder: LeadStage[] = [
            'NEW',
            'QUALIFYING',
            'HOT_ENGAGED',
            'MEETING_SCHEDULED',
            'DISCOVERY_COMPLETE',
            'PROPOSAL_SENT',
            'NEGOTIATION',
            'CONTRACT_STAGE',
            'CLOSED_WON',
        ];

        const leadCounts = await this.prisma.lead.groupBy({
            by: ['stage'],
            _count: { id: true },
        });

        const stageMap = new Map(leadCounts.map(l => [l.stage, l._count.id]));

        const funnel = stageOrder.map((stage, index) => {
            const count = stageMap.get(stage) || 0;
            const previousCount = index > 0 ? (stageMap.get(stageOrder[index - 1]) || 0) : count;
            const conversionRate = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;

            return {
                stage,
                count,
                conversionRate: index === 0 ? 100 : conversionRate,
            };
        });

        const totalLeads = leadCounts.reduce((sum, l) => sum + l._count.id, 0);
        const wonLeads = stageMap.get('CLOSED_WON') || 0;
        const lostLeads = stageMap.get('CLOSED_LOST') || 0;
        const overallConversion = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

        return {
            funnel,
            totalLeads,
            wonLeads,
            lostLeads,
            overallConversion,
        };
    }

    /**
     * Get meeting completion statistics
     */
    async getMeetingMetrics() {
        const now = new Date();

        const meetings = await this.prisma.meeting.groupBy({
            by: ['status'],
            _count: { id: true },
        });

        const statusMap = new Map(meetings.map(m => [m.status, m._count.id]));

        const total = meetings.reduce((sum, m) => sum + m._count.id, 0);
        const completed = statusMap.get('COMPLETED') || 0;
        const noShow = statusMap.get('NO_SHOW') || 0;
        const cancelled = statusMap.get('CANCELLED') || 0;
        const scheduled = statusMap.get('SCHEDULED') || 0;

        // Weekly meeting trend (last 8 weeks)
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const weeklyMeetings = await this.prisma.meeting.findMany({
            where: {
                startTime: { gte: eightWeeksAgo },
            },
            select: {
                startTime: true,
                status: true,
            },
        });

        const weeklyData: { week: string; count: number }[] = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const count = weeklyMeetings.filter(m =>
                m.startTime >= weekStart && m.startTime < weekEnd
            ).length;

            weeklyData.push({
                week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count,
            });
        }

        return {
            total,
            completed,
            noShow,
            cancelled,
            scheduled,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
            weeklyTrend: weeklyData,
        };
    }

    /**
     * Get team/rep performance metrics
     */
    async getPerformanceMetrics() {
        // Get all sales reps
        const reps = await this.prisma.user.findMany({
            where: { role: 'SALES_REP' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });

        // Get leads per rep
        const leadsPerRep = await this.prisma.lead.groupBy({
            by: ['assignedToId'],
            _count: { id: true },
        });

        // Get completed meetings per rep (via lead's assignedToId)
        const completedMeetings = await this.prisma.meeting.findMany({
            where: { status: 'COMPLETED' },
            select: {
                lead: {
                    select: { assignedToId: true }
                }
            }
        });

        // Count meetings per rep
        const meetingsCountMap = new Map<string, number>();
        completedMeetings.forEach(m => {
            if (m.lead.assignedToId) {
                meetingsCountMap.set(m.lead.assignedToId, (meetingsCountMap.get(m.lead.assignedToId) || 0) + 1);
            }
        });

        // Get won deals per rep
        const winsPerRep = await this.prisma.lead.groupBy({
            by: ['assignedToId'],
            where: { stage: 'CLOSED_WON' },
            _count: { id: true },
        });

        const leadsMap = new Map(leadsPerRep.map(l => [l.assignedToId, l._count.id]));
        const winsMap = new Map(winsPerRep.map(w => [w.assignedToId, w._count.id]));

        const performance = reps.map(rep => {
            const leads = leadsMap.get(rep.id) || 0;
            const meetings = meetingsCountMap.get(rep.id) || 0;
            const wins = winsMap.get(rep.id) || 0;
            const conversionRate = leads > 0 ? Math.round((wins / leads) * 100) : 0;

            return {
                id: rep.id,
                name: `${rep.firstName} ${rep.lastName}`,
                leads,
                meetings,
                wins,
                conversionRate,
            };
        });

        // Sort by wins descending
        performance.sort((a, b) => b.wins - a.wins);

        return { performance };
    }

    /**
     * Get response time metrics
     */
    async getTimelineMetrics() {
        // Average time from lead creation to first activity
        const leadsWithActivity = await this.prisma.lead.findMany({
            where: {
                activities: { some: {} },
            },
            select: {
                createdAt: true,
                activities: {
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { createdAt: true },
                },
            },
        });

        let totalFirstContactTime = 0;
        let firstContactCount = 0;

        leadsWithActivity.forEach(lead => {
            if (lead.activities.length > 0) {
                const diff = lead.activities[0].createdAt.getTime() - lead.createdAt.getTime();
                totalFirstContactTime += diff;
                firstContactCount++;
            }
        });

        const avgFirstContactHours = firstContactCount > 0
            ? Math.round((totalFirstContactTime / firstContactCount) / (1000 * 60 * 60) * 10) / 10
            : 0;

        // Average time from lead creation to first meeting
        const leadsWithMeeting = await this.prisma.lead.findMany({
            where: {
                meetings: { some: {} },
            },
            select: {
                createdAt: true,
                meetings: {
                    orderBy: { startTime: 'asc' },
                    take: 1,
                    select: { startTime: true },
                },
            },
        });

        let totalMeetingTime = 0;
        let meetingCount = 0;

        leadsWithMeeting.forEach(lead => {
            if (lead.meetings.length > 0) {
                const diff = lead.meetings[0].startTime.getTime() - lead.createdAt.getTime();
                totalMeetingTime += diff;
                meetingCount++;
            }
        });

        const avgTimeToMeetingDays = meetingCount > 0
            ? Math.round((totalMeetingTime / meetingCount) / (1000 * 60 * 60 * 24) * 10) / 10
            : 0;

        // Average deal cycle (creation to CLOSED_WON)
        const wonLeads = await this.prisma.lead.findMany({
            where: { stage: 'CLOSED_WON' },
            select: {
                createdAt: true,
                updatedAt: true,
            },
        });

        let totalCycleTime = 0;
        wonLeads.forEach(lead => {
            totalCycleTime += lead.updatedAt.getTime() - lead.createdAt.getTime();
        });

        const avgDealCycleDays = wonLeads.length > 0
            ? Math.round((totalCycleTime / wonLeads.length) / (1000 * 60 * 60 * 24) * 10) / 10
            : 0;

        return {
            avgFirstContactHours,
            avgTimeToMeetingDays,
            avgDealCycleDays,
        };
    }
}
