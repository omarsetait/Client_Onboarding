import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface EmailAttachment {
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    trackOpens?: boolean;
    trackClicks?: boolean;
    headers?: Record<string, string>;
    metadata?: Record<string, unknown>;
    attachments?: EmailAttachment[];
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.fromEmail = configService.get<string>('EMAIL_FROM', 'noreply@tachyhealth.com');
        this.fromName = configService.get<string>('EMAIL_FROM_NAME', 'TachyHealth');
    }

    async sendEmail(options: EmailOptions, leadId?: string): Promise<EmailResult> {
        const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');

        if (!sendgridApiKey) {
            this.logger.warn('SendGrid API key not configured, simulating email send');
            return this.simulateSend(options, leadId);
        }

        try {
            // In production, use SendGrid SDK
            const response = await this.sendViaSendGrid(options, sendgridApiKey);

            // Log the communication
            if (leadId) {
                await this.logCommunication(leadId, options, response.messageId);
            }

            return response;
        } catch (error) {
            this.logger.error('Failed to send email', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async sendBulk(emails: { options: EmailOptions; leadId?: string }[]): Promise<EmailResult[]> {
        const results: EmailResult[] = [];

        for (const email of emails) {
            const result = await this.sendEmail(email.options, email.leadId);
            results.push(result);

            // Rate limiting: 100ms between emails
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }

    private async sendViaSendGrid(options: EmailOptions, apiKey: string): Promise<EmailResult> {
        // SendGrid API call
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{
                    to: [{ email: options.to }],
                    cc: options.cc?.map(email => ({ email })),
                    bcc: options.bcc?.map(email => ({ email })),
                }],
                from: {
                    email: options.from || this.fromEmail,
                    name: this.fromName,
                },
                reply_to: options.replyTo ? { email: options.replyTo } : undefined,
                subject: options.subject,
                content: [
                    { type: 'text/plain', value: options.text || this.htmlToText(options.html) },
                    { type: 'text/html', value: options.html },
                ],
                tracking_settings: {
                    open_tracking: { enable: options.trackOpens !== false },
                    click_tracking: { enable: options.trackClicks !== false },
                },
                custom_args: options.metadata,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`SendGrid error: ${error}`);
        }

        const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;

        return { success: true, messageId };
    }

    private async simulateSend(options: EmailOptions, leadId?: string): Promise<EmailResult> {
        this.logger.log(`[SIMULATED] Email sent to ${options.to}: ${options.subject}`);

        const messageId = `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        if (leadId) {
            await this.logCommunication(leadId, options, messageId);
        }

        return { success: true, messageId };
    }

    private async logCommunication(
        leadId: string,
        options: EmailOptions,
        messageId?: string,
    ): Promise<void> {
        await this.prisma.communication.create({
            data: {
                leadId,
                channel: 'EMAIL',
                direction: 'OUTBOUND',
                subject: options.subject,
                content: options.html,
                status: 'SENT',
                sentAt: new Date(),
                metadata: {
                    messageId,
                    to: options.to,
                    from: options.from || this.fromEmail,
                    trackOpens: options.trackOpens,
                    trackClicks: options.trackClicks,
                },
            },
        });

        // Also log as activity
        await this.prisma.activity.create({
            data: {
                leadId,
                type: 'EMAIL_SENT',
                content: `Email sent: ${options.subject}`,
                automated: true,
                metadata: { messageId },
            },
        });
    }

    private htmlToText(html: string): string {
        return html
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
