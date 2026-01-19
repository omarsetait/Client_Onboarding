import { Injectable, Logger } from '@nestjs/common';
import { NotificationsGateway, NotificationPayload } from './notifications.gateway';
import { TeamsService, HotLeadAlert, MeetingAlert, DocumentSignedAlert } from './teams.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotifyLeadUpdateOptions {
    leadId: string;
    type: 'STAGE_CHANGE' | 'SCORE_UPDATE' | 'ASSIGNMENT' | 'NOTE_ADDED';
    message: string;
    data?: Record<string, any>;
    userId?: string;
}

export interface NotifyNewLeadOptions {
    leadId: string;
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
    score?: number;
    source: string;
    message?: string;
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private readonly hotLeadThreshold = 70; // Score threshold for hot lead alerts

    constructor(
        private readonly gateway: NotificationsGateway,
        private readonly teamsService: TeamsService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Notify about lead updates (stage change, score update, etc.)
     */
    async notifyLeadUpdate(options: NotifyLeadUpdateOptions): Promise<void> {
        const notification: NotificationPayload = {
            type: options.type === 'STAGE_CHANGE' ? 'STAGE_CHANGE' : 'LEAD_UPDATE',
            title: this.getTitleForType(options.type),
            message: options.message,
            data: options.data,
            leadId: options.leadId,
            userId: options.userId,
            priority: 'medium',
            timestamp: new Date(),
        };

        // Send to WebSocket subscribers
        this.gateway.sendToLeadSubscribers(options.leadId, notification);

        // If user specified, also send directly to them
        if (options.userId) {
            this.gateway.sendToUser(options.userId, notification);
        }

        this.logger.debug(`Lead update notification: ${options.type} for ${options.leadId}`);
    }

    /**
     * Notify about new lead - triggers Teams alert if hot
     */
    async notifyNewLead(lead: NotifyNewLeadOptions): Promise<void> {
        const notification: NotificationPayload = {
            type: 'NEW_LEAD',
            title: 'New Lead',
            message: `${lead.firstName} ${lead.lastName} from ${lead.companyName}`,
            data: lead,
            leadId: lead.leadId,
            priority: (lead.score || 0) >= this.hotLeadThreshold ? 'high' : 'medium',
            timestamp: new Date(),
        };

        // Broadcast to all connected users
        this.gateway.broadcastToAll(notification);

        // If hot lead, also send to Teams
        if ((lead.score || 0) >= this.hotLeadThreshold) {
            await this.sendHotLeadToTeams(lead);
        }

        this.logger.log(`New lead notification sent: ${lead.firstName} ${lead.lastName}`);
    }

    /**
     * Notify about hot lead (high score)
     */
    async notifyHotLead(lead: NotifyNewLeadOptions): Promise<void> {
        const notification: NotificationPayload = {
            type: 'HOT_LEAD',
            title: '🔥 Hot Lead!',
            message: `${lead.firstName} ${lead.lastName} from ${lead.companyName} (Score: ${lead.score})`,
            data: lead,
            leadId: lead.leadId,
            priority: 'urgent',
            timestamp: new Date(),
        };

        // Broadcast to all users
        this.gateway.broadcastToAll(notification);

        // Send to Teams
        await this.sendHotLeadToTeams(lead);

        this.logger.log(`Hot lead alert sent: ${lead.firstName} ${lead.lastName}`);
    }

    /**
     * Notify about meeting scheduled
     */
    async notifyMeetingScheduled(meeting: {
        meetingId: string;
        leadId: string;
        leadName: string;
        companyName: string;
        scheduledAt: Date;
        meetingType: string;
        joinUrl?: string;
        assignedUserId?: string;
    }): Promise<void> {
        const notification: NotificationPayload = {
            type: 'MEETING_SCHEDULED',
            title: '📅 Meeting Scheduled',
            message: `Meeting with ${meeting.leadName} (${meeting.companyName})`,
            data: meeting,
            leadId: meeting.leadId,
            userId: meeting.assignedUserId,
            priority: 'high',
            timestamp: new Date(),
        };

        // Send to assigned user
        if (meeting.assignedUserId) {
            this.gateway.sendToUser(meeting.assignedUserId, notification);
        }

        // Send to lead subscribers
        this.gateway.sendToLeadSubscribers(meeting.leadId, notification);

        // Send to Teams
        await this.teamsService.sendMeetingAlert({
            meetingId: meeting.meetingId,
            leadName: meeting.leadName,
            company: meeting.companyName,
            scheduledAt: meeting.scheduledAt,
            meetingType: meeting.meetingType,
            joinUrl: meeting.joinUrl,
        });

        this.logger.log(`Meeting notification sent: ${meeting.leadName}`);
    }

    /**
     * Notify about document signed
     */
    async notifyDocumentSigned(document: {
        documentId: string;
        documentName: string;
        documentType: string;
        leadId: string;
        leadName: string;
        companyName: string;
        signedAt: Date;
        assignedUserId?: string;
    }): Promise<void> {
        const notification: NotificationPayload = {
            type: 'DOCUMENT_SIGNED',
            title: '✍️ Document Signed!',
            message: `${document.documentName} signed by ${document.leadName}`,
            data: document,
            leadId: document.leadId,
            userId: document.assignedUserId,
            priority: 'high',
            timestamp: new Date(),
        };

        // Send to assigned user
        if (document.assignedUserId) {
            this.gateway.sendToUser(document.assignedUserId, notification);
        }

        // Broadcast to all (important event)
        this.gateway.broadcastToAll(notification);

        // Send to Teams
        await this.teamsService.sendDocumentSignedAlert({
            documentId: document.documentId,
            documentName: document.documentName,
            documentType: document.documentType,
            leadName: document.leadName,
            company: document.companyName,
            signedAt: document.signedAt,
        });

        this.logger.log(`Document signed notification sent: ${document.documentName}`);
    }

    /**
     * Notify about received email
     */
    async notifyEmailReceived(email: {
        leadId: string;
        leadName: string;
        subject: string;
        preview: string;
        assignedUserId?: string;
    }): Promise<void> {
        const notification: NotificationPayload = {
            type: 'EMAIL_RECEIVED',
            title: '📧 New Email',
            message: `From ${email.leadName}: ${email.subject}`,
            data: email,
            leadId: email.leadId,
            userId: email.assignedUserId,
            priority: 'medium',
            timestamp: new Date(),
        };

        if (email.assignedUserId) {
            this.gateway.sendToUser(email.assignedUserId, notification);
        }

        this.gateway.sendToLeadSubscribers(email.leadId, notification);

        this.logger.debug(`Email notification sent: ${email.subject}`);
    }

    /**
     * Send hot lead alert to Teams
     */
    private async sendHotLeadToTeams(lead: NotifyNewLeadOptions): Promise<void> {
        const alert: HotLeadAlert = {
            leadId: lead.leadId,
            name: `${lead.firstName} ${lead.lastName}`,
            company: lead.companyName,
            email: lead.email,
            score: lead.score || 0,
            source: lead.source,
            message: lead.message,
        };

        await this.teamsService.sendHotLeadAlert(alert);
    }

    private getTitleForType(type: string): string {
        const titles: Record<string, string> = {
            'STAGE_CHANGE': 'Stage Updated',
            'SCORE_UPDATE': 'Score Updated',
            'ASSIGNMENT': 'Lead Assigned',
            'NOTE_ADDED': 'Note Added',
        };
        return titles[type] || 'Lead Updated';
    }
}
