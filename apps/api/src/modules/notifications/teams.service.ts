import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TeamsCard {
    type: 'message';
    attachments: TeamsAdaptiveCard[];
}

interface TeamsAdaptiveCard {
    contentType: 'application/vnd.microsoft.card.adaptive';
    content: {
        type: 'AdaptiveCard';
        version: '1.4';
        body: any[];
        actions?: any[];
        $schema: string;
    };
}

export interface HotLeadAlert {
    leadId: string;
    name: string;
    company: string;
    email: string;
    score: number;
    source: string;
    message?: string;
}

export interface MeetingAlert {
    meetingId: string;
    leadName: string;
    company: string;
    scheduledAt: Date;
    meetingType: string;
    joinUrl?: string;
}

export interface DocumentSignedAlert {
    documentId: string;
    documentName: string;
    leadName: string;
    company: string;
    signedAt: Date;
    documentType: string;
}

@Injectable()
export class TeamsService {
    private readonly logger = new Logger(TeamsService.name);
    private readonly webhookUrls: {
        hotLeads?: string;
        meetings?: string;
        documents?: string;
        general?: string;
    };
    private readonly isConfigured: boolean;
    private readonly appBaseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.webhookUrls = {
            hotLeads: this.configService.get('TEAMS_WEBHOOK_HOT_LEADS'),
            meetings: this.configService.get('TEAMS_WEBHOOK_MEETINGS'),
            documents: this.configService.get('TEAMS_WEBHOOK_DOCUMENTS'),
            general: this.configService.get('TEAMS_WEBHOOK_GENERAL'),
        };

        this.isConfigured = !!(
            this.webhookUrls.hotLeads ||
            this.webhookUrls.meetings ||
            this.webhookUrls.documents ||
            this.webhookUrls.general
        );

        this.appBaseUrl = this.configService.get('APP_BASE_URL', 'http://localhost:3000');

        if (!this.isConfigured) {
            this.logger.warn('Microsoft Teams webhooks not configured - notifications will be simulated');
        } else {
            this.logger.log('Microsoft Teams integration configured');
        }
    }

    /**
     * Send hot lead alert to Teams
     */
    async sendHotLeadAlert(lead: HotLeadAlert): Promise<boolean> {
        const card = this.createHotLeadCard(lead);
        const webhookUrl = this.webhookUrls.hotLeads || this.webhookUrls.general;

        if (!webhookUrl) {
            this.simulateTeamsNotification('Hot Lead Alert', lead);
            return true;
        }

        return this.sendToTeams(webhookUrl, card);
    }

    /**
     * Send meeting scheduled alert to Teams
     */
    async sendMeetingAlert(meeting: MeetingAlert): Promise<boolean> {
        const card = this.createMeetingCard(meeting);
        const webhookUrl = this.webhookUrls.meetings || this.webhookUrls.general;

        if (!webhookUrl) {
            this.simulateTeamsNotification('Meeting Scheduled', meeting);
            return true;
        }

        return this.sendToTeams(webhookUrl, card);
    }

    /**
     * Send document signed alert to Teams
     */
    async sendDocumentSignedAlert(doc: DocumentSignedAlert): Promise<boolean> {
        const card = this.createDocumentSignedCard(doc);
        const webhookUrl = this.webhookUrls.documents || this.webhookUrls.general;

        if (!webhookUrl) {
            this.simulateTeamsNotification('Document Signed', doc);
            return true;
        }

        return this.sendToTeams(webhookUrl, card);
    }

    /**
     * Create adaptive card for hot lead
     */
    private createHotLeadCard(lead: HotLeadAlert): TeamsCard {
        const scoreColor = lead.score >= 80 ? 'attention' : lead.score >= 60 ? 'warning' : 'good';

        return {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    type: 'AdaptiveCard',
                    version: '1.4',
                    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                    body: [
                        {
                            type: 'Container',
                            style: 'emphasis',
                            items: [
                                {
                                    type: 'ColumnSet',
                                    columns: [
                                        {
                                            type: 'Column',
                                            width: 'auto',
                                            items: [{
                                                type: 'TextBlock',
                                                text: '🔥',
                                                size: 'Large',
                                            }],
                                        },
                                        {
                                            type: 'Column',
                                            width: 'stretch',
                                            items: [
                                                {
                                                    type: 'TextBlock',
                                                    text: 'Hot Lead Alert!',
                                                    weight: 'Bolder',
                                                    size: 'Medium',
                                                    color: 'attention',
                                                },
                                                {
                                                    type: 'TextBlock',
                                                    text: `Score: ${lead.score}/100`,
                                                    color: scoreColor,
                                                    spacing: 'None',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: 'FactSet',
                            facts: [
                                { title: 'Name', value: lead.name },
                                { title: 'Company', value: lead.company },
                                { title: 'Email', value: lead.email },
                                { title: 'Source', value: lead.source },
                            ],
                        },
                        lead.message ? {
                            type: 'TextBlock',
                            text: `"${lead.message}"`,
                            wrap: true,
                            isSubtle: true,
                            fontType: 'Default',
                            style: 'default',
                        } : null,
                    ].filter(Boolean),
                    actions: [
                        {
                            type: 'Action.OpenUrl',
                            title: 'View Lead',
                            url: `${this.appBaseUrl}/leads/${lead.leadId}`,
                        },
                        {
                            type: 'Action.OpenUrl',
                            title: 'Schedule Call',
                            url: `${this.appBaseUrl}/leads/${lead.leadId}?action=schedule`,
                        },
                    ],
                },
            }],
        };
    }

    /**
     * Create adaptive card for meeting
     */
    private createMeetingCard(meeting: MeetingAlert): TeamsCard {
        const meetingTime = new Date(meeting.scheduledAt).toLocaleString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        return {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    type: 'AdaptiveCard',
                    version: '1.4',
                    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                    body: [
                        {
                            type: 'Container',
                            style: 'emphasis',
                            items: [{
                                type: 'ColumnSet',
                                columns: [
                                    {
                                        type: 'Column',
                                        width: 'auto',
                                        items: [{
                                            type: 'TextBlock',
                                            text: '📅',
                                            size: 'Large',
                                        }],
                                    },
                                    {
                                        type: 'Column',
                                        width: 'stretch',
                                        items: [{
                                            type: 'TextBlock',
                                            text: 'Meeting Scheduled',
                                            weight: 'Bolder',
                                            size: 'Medium',
                                            color: 'good',
                                        }],
                                    },
                                ],
                            }],
                        },
                        {
                            type: 'FactSet',
                            facts: [
                                { title: 'Lead', value: meeting.leadName },
                                { title: 'Company', value: meeting.company },
                                { title: 'Type', value: meeting.meetingType },
                                { title: 'When', value: meetingTime },
                            ],
                        },
                    ],
                    actions: meeting.joinUrl ? [
                        {
                            type: 'Action.OpenUrl',
                            title: 'Join Meeting',
                            url: meeting.joinUrl,
                            style: 'positive',
                        },
                        {
                            type: 'Action.OpenUrl',
                            title: 'View Details',
                            url: `${this.appBaseUrl}/calendar?meeting=${meeting.meetingId}`,
                        },
                    ] : [
                        {
                            type: 'Action.OpenUrl',
                            title: 'View Details',
                            url: `${this.appBaseUrl}/calendar?meeting=${meeting.meetingId}`,
                        },
                    ],
                },
            }],
        };
    }

    /**
     * Create adaptive card for signed document
     */
    private createDocumentSignedCard(doc: DocumentSignedAlert): TeamsCard {
        const signedTime = new Date(doc.signedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        return {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    type: 'AdaptiveCard',
                    version: '1.4',
                    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                    body: [
                        {
                            type: 'Container',
                            style: 'emphasis',
                            items: [{
                                type: 'ColumnSet',
                                columns: [
                                    {
                                        type: 'Column',
                                        width: 'auto',
                                        items: [{
                                            type: 'TextBlock',
                                            text: '✍️',
                                            size: 'Large',
                                        }],
                                    },
                                    {
                                        type: 'Column',
                                        width: 'stretch',
                                        items: [{
                                            type: 'TextBlock',
                                            text: 'Document Signed!',
                                            weight: 'Bolder',
                                            size: 'Medium',
                                            color: 'good',
                                        }],
                                    },
                                ],
                            }],
                        },
                        {
                            type: 'FactSet',
                            facts: [
                                { title: 'Document', value: doc.documentName },
                                { title: 'Type', value: doc.documentType },
                                { title: 'Lead', value: doc.leadName },
                                { title: 'Company', value: doc.company },
                                { title: 'Signed', value: signedTime },
                            ],
                        },
                    ],
                    actions: [
                        {
                            type: 'Action.OpenUrl',
                            title: 'Download Document',
                            url: `${this.appBaseUrl}/documents/${doc.documentId}/download`,
                        },
                        {
                            type: 'Action.OpenUrl',
                            title: 'View Lead',
                            url: `${this.appBaseUrl}/leads/${doc.documentId}`,
                        },
                    ],
                },
            }],
        };
    }

    /**
     * Send card to Teams webhook
     */
    private async sendToTeams(webhookUrl: string, card: TeamsCard): Promise<boolean> {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card),
            });

            if (!response.ok) {
                throw new Error(`Teams webhook response: ${response.status}`);
            }

            this.logger.log('Teams notification sent successfully');
            return true;
        } catch (error) {
            this.logger.error(`Failed to send Teams notification: ${error.message}`);
            return false;
        }
    }

    /**
     * Simulate Teams notification for development
     */
    private simulateTeamsNotification(type: string, data: any): void {
        this.logger.log(`[SIMULATED TEAMS] ${type}:`);
        this.logger.log(JSON.stringify(data, null, 2));
    }
}
