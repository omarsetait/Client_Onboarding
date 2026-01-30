import { Controller, Post, Get, Patch, Param, Body, UseGuards, Query, NotFoundException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutoSchedulerService } from './auto-scheduler.service';
import { CalendarService } from './calendar.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { PrismaService } from '../../prisma/prisma.service';

class ScheduleMeetingDto {
    @IsOptional()
    @IsString()
    meetingType?: 'discovery' | 'demo' | 'technical' | 'closing';

    @IsOptional()
    @IsString()
    preferredTime?: string; // ISO date string
}

export class UpdateMeetingOutcomeDto {
    @IsString()
    status: 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED';

    @IsOptional()
    @IsString()
    notes?: string;
}

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
    constructor(
        private readonly autoScheduler: AutoSchedulerService,
        private readonly graphService: MicrosoftGraphService,
        private readonly calendarService: CalendarService,
        private readonly prisma: PrismaService,
    ) { }

    @Get('meetings')
    @ApiOperation({ summary: 'Get all meetings' })
    async getMeetings(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const where: any = {};

        if (startDate && endDate) {
            where.startTime = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const meetings = await this.prisma.meeting.findMany({
            where,
            include: {
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        email: true,
                        jobTitle: true,
                        stage: true,
                        phone: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        return { meetings };
    }

    @Get('meetings/pending-outcomes')
    @ApiOperation({ summary: 'Get meetings pending release/outcome' })
    async getPendingOutcomes() {
        const now = new Date();
        const meetings = await this.prisma.meeting.findMany({
            where: {
                endTime: { lt: now },
                status: 'SCHEDULED',
            },
            orderBy: { endTime: 'desc' },
            include: {
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        companyName: true,
                    },
                },
            },
        });

        return {
            count: meetings.length,
            meetings
        };
    }

    @Post('leads/:id/schedule')
    @ApiOperation({ summary: 'Auto-schedule a meeting for a lead' })
    async scheduleMeeting(
        @Param('id') leadId: string,
        @Body() dto: ScheduleMeetingDto,
    ) {
        const preferredSlot = dto.preferredTime
            ? {
                start: new Date(dto.preferredTime),
                end: new Date(new Date(dto.preferredTime).getTime() + 30 * 60 * 1000),
            }
            : undefined;

        return this.autoScheduler.autoScheduleMeeting(
            leadId,
            dto.meetingType || 'discovery',
            preferredSlot,
        );
    }

    @Get('availability')
    @ApiOperation({ summary: 'Get available meeting slots' })
    async getAvailability(
        @Query('email') email: string,
        @Query('duration') duration: number = 30,
        @Query('days') daysAhead: number = 7,
    ) {
        if (!this.graphService.isAvailable()) {
            // Return simulated slots if not configured
            return this.generateSimulatedSlots(daysAhead, duration);
        }

        const slots = await this.graphService.findAvailableSlots(
            email,
            duration,
            daysAhead,
        );

        return { slots };
    }

    @Get('status')
    @ApiOperation({ summary: 'Check calendar integration status' })
    async getStatus() {
        return {
            microsoftGraphConfigured: this.graphService.isAvailable(),
            provider: 'microsoft',
        };
    }

    @Patch('meetings/:id/outcome')
    @ApiOperation({ summary: 'Update meeting outcome' })
    async updateOutcome(
        @Param('id') id: string,
        @Body() dto: UpdateMeetingOutcomeDto,
        @Req() req: any,
    ) {
        const meeting = await this.prisma.meeting.findUnique({ where: { id } });
        if (!meeting) throw new NotFoundException('Meeting not found');

        return this.calendarService.handleMeetingOutcome({
            meetingId: id,
            status: dto.status,
            notes: dto.notes,
            userId: req.user?.id,
        });
    }

    private generateSimulatedSlots(daysAhead: number, duration: number) {
        const slots: { start: Date; end: Date }[] = [];
        const now = new Date();

        for (let day = 1; day <= daysAhead; day++) {
            const date = new Date(now);
            date.setDate(date.getDate() + day);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // Add 3 slots per day
            for (const hour of [10, 14, 16]) {
                const start = new Date(date);
                start.setHours(hour, 0, 0, 0);

                const end = new Date(start);
                end.setMinutes(end.getMinutes() + duration);

                slots.push({ start, end });
            }
        }

        return { slots: slots.slice(0, 10), simulated: true };
    }
}
