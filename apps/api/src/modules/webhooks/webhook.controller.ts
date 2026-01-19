import { Controller, Post, Body, Logger, Headers, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// DTOs for webhook payloads
class LeadWebhookDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsEmail()
    email: string;

    @IsString()
    companyName: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    jobTitle?: string;

    @IsOptional()
    @IsString()
    industry?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsString()
    message?: string;
}

class EmailReplyWebhookDto {
    @IsString()
    to: string;

    @IsEmail()
    from: string;

    @IsString()
    subject: string;

    @IsOptional()
    @IsString()
    text?: string;

    @IsOptional()
    @IsString()
    html?: string;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
    ) { }

    @Post('lead')
    @ApiOperation({ summary: 'Receive new lead from external sources (website form, etc.)' })
    async handleNewLead(@Body() dto: LeadWebhookDto, @Res() res: Response) {
        this.logger.log(`Received new lead webhook: ${dto.email}`);

        try {
            // Check if lead already exists (active, not deleted)
            const existing = await this.prisma.lead.findFirst({
                where: { email: dto.email, deletedAt: null },
            });

            if (existing) {
                // Update existing lead
                await this.prisma.activity.create({
                    data: {
                        leadId: existing.id,
                        type: 'WORKFLOW_TRIGGERED',
                        content: `Re-submitted form: ${dto.message || 'No message'}`,
                        automated: true,
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: 'Lead already exists, activity logged',
                    leadId: existing.id,
                });
            }

            // Create new lead
            const lead = await this.prisma.lead.create({
                data: {
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                    companyName: dto.companyName,
                    phone: dto.phone,
                    jobTitle: dto.jobTitle,
                    industry: dto.industry,
                    source: (dto.source as any) || 'WEBSITE_FORM',
                    originalMessage: dto.message,
                    stage: 'NEW',
                    status: 'ACTIVE',
                    score: 0,
                },
            });

            this.logger.log(`Created lead ${lead.id} via webhook`);

            // Queue for AI processing pipeline
            await this.agentQueue.add('new-lead-pipeline', { leadId: lead.id });

            // Send real-time notification
            await this.notificationsService.notifyNewLead({
                leadId: lead.id,
                firstName: lead.firstName,
                lastName: lead.lastName,
                companyName: lead.companyName,
                email: lead.email,
                score: 0,
                source: dto.source || 'website_form',
                message: dto.message,
            });

            return res.status(201).json({
                success: true,
                message: 'Lead created and queued for processing',
                leadId: lead.id,
            });
        } catch (error) {
            this.logger.error('Failed to process lead webhook', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to process lead',
            });
        }
    }

    @Post('email-reply')
    @ApiOperation({ summary: 'Receive inbound email replies (from SendGrid)' })
    async handleEmailReply(
        @Body() dto: EmailReplyWebhookDto,
        @Headers('x-sendgrid-signature') signature: string,
        @Res() res: Response,
    ) {
        this.logger.log(`Received email reply from: ${dto.from}`);

        try {
            // Find lead by email
            const lead = await this.prisma.lead.findFirst({
                where: { email: dto.from },
            });

            if (!lead) {
                this.logger.warn(`No lead found for email: ${dto.from}`);
                return res.status(200).json({ success: true, message: 'No matching lead' });
            }

            // Log the inbound communication
            await this.prisma.communication.create({
                data: {
                    leadId: lead.id,
                    channel: 'EMAIL',
                    direction: 'INBOUND',
                    subject: dto.subject,
                    content: dto.html || dto.text || '',
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                },
            });

            // Log activity
            await this.prisma.activity.create({
                data: {
                    leadId: lead.id,
                    type: 'EMAIL_RECEIVED',
                    content: `Reply received: ${dto.subject}`,
                    automated: true,
                },
            });

            // If lead was in nurturing stage, mark as engaged
            if (['WARM_NURTURING', 'QUALIFYING'].includes(lead.stage)) {
                await this.prisma.lead.update({
                    where: { id: lead.id },
                    data: { stage: 'HOT_ENGAGED' },
                });

                this.logger.log(`Lead ${lead.id} upgraded to HOT_ENGAGED after reply`);
            }

            // Trigger AI to analyze reply and suggest response
            await this.agentQueue.add('process-lead', {
                leadId: lead.id,
                step: 'analyze-reply',
            });

            return res.status(200).json({
                success: true,
                message: 'Email reply processed',
                leadId: lead.id,
            });
        } catch (error) {
            this.logger.error('Failed to process email reply', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to process reply',
            });
        }
    }

    @Post('calendar-event')
    @ApiOperation({ summary: 'Receive calendar event updates (meeting completed, etc.)' })
    async handleCalendarEvent(@Body() body: any, @Res() res: Response) {
        this.logger.log('Received calendar event webhook');

        // Handle meeting completed
        if (body.type === 'meeting.ended' || body.type === 'event.completed') {
            const meetingId = body.resourceId || body.eventId;

            const meeting = await this.prisma.meeting.findFirst({
                where: { externalEventId: meetingId },
                include: { lead: true },
            });

            if (meeting) {
                // Update meeting status
                await this.prisma.meeting.update({
                    where: { id: meeting.id },
                    data: { status: 'COMPLETED' },
                });

                // Log activity
                await this.prisma.activity.create({
                    data: {
                        leadId: meeting.leadId,
                        type: 'MEETING_HELD',
                        content: `Meeting completed: ${meeting.title}`,
                        automated: true,
                    },
                });

                // Trigger post-meeting workflow (generate summary, send follow-up)
                await this.agentQueue.add('process-lead', {
                    leadId: meeting.leadId,
                    step: 'post-meeting',
                });

                this.logger.log(`Meeting ${meeting.id} marked as completed`);
            }
        }

        return res.status(200).json({ success: true });
    }
}
