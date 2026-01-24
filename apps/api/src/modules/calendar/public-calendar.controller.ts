import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { IsString, IsNotEmpty, IsISO8601, IsOptional } from 'class-validator';

class BookMeetingDto {
    @IsString()
    @IsNotEmpty()
    leadId: string;

    @IsISO8601()
    @IsNotEmpty()
    startTime: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

@ApiTags('Public')
@Controller('public/calendar')
export class PublicCalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Get('availability')
    @ApiOperation({ summary: 'Get public availability slots' })
    async getAvailability() {
        return this.calendarService.findGlobalAvailability();
    }

    @Post('book')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Book a meeting from public page' })
    async bookMeeting(@Body() dto: BookMeetingDto) {
        try {
            const meeting = await this.calendarService.bookPublicMeeting(dto.leadId, dto.startTime, dto.notes);
            return {
                success: true,
                message: 'Meeting scheduled successfully',
                meeting,
            };
        } catch (error) {
            throw new HttpException('Failed to book meeting: ' + (error.message || 'Unknown error'), HttpStatus.BAD_REQUEST);
        }
    }
}
