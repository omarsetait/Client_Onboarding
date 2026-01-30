import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('funnel')
    @ApiOperation({ summary: 'Get funnel metrics (stage distribution & conversion rates)' })
    async getFunnelMetrics() {
        return this.analyticsService.getFunnelMetrics();
    }

    @Get('meetings')
    @ApiOperation({ summary: 'Get meeting performance metrics' })
    async getMeetingMetrics() {
        return this.analyticsService.getMeetingMetrics();
    }

    @Get('performance')
    @ApiOperation({ summary: 'Get team/rep performance metrics' })
    async getPerformanceMetrics() {
        return this.analyticsService.getPerformanceMetrics();
    }

    @Get('timeline')
    @ApiOperation({ summary: 'Get response time metrics' })
    async getTimelineMetrics() {
        return this.analyticsService.getTimelineMetrics();
    }

    @Get('summary')
    @ApiOperation({ summary: 'Get all analytics in one call' })
    async getSummary() {
        const [funnel, meetings, performance, timeline] = await Promise.all([
            this.analyticsService.getFunnelMetrics(),
            this.analyticsService.getMeetingMetrics(),
            this.analyticsService.getPerformanceMetrics(),
            this.analyticsService.getTimelineMetrics(),
        ]);

        return { funnel, meetings, performance, timeline };
    }
}
