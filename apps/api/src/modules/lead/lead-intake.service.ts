import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../communication/email.service';
import { ProductDocumentService, ProductType } from '../documents/product-document.service';
import { AgentOrchestrator } from '../ai-agents/orchestrator.service';
import { ConfigService } from '@nestjs/config';

export interface LeadIntakeDto {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    companyName: string;
    jobTitle: string;
    productsOfInterest: ProductType[];
    message: string;
}

export interface LeadIntakeResult {
    success: boolean;
    leadId?: string;
    message: string;
    emailSent?: boolean;
    documentsAttached?: string[];
}

/**
 * Service for handling public lead intake (contact form submissions)
 * Orchestrates lead creation, document selection, and acknowledgment emails
 */
@Injectable()
export class LeadIntakeService {
    private readonly logger = new Logger(LeadIntakeService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly productDocumentService: ProductDocumentService,
        private readonly agentOrchestrator: AgentOrchestrator,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Process a new lead from the public contact form
     */
    async processLeadIntake(dto: LeadIntakeDto): Promise<LeadIntakeResult> {
        this.logger.log(`Processing lead intake for ${dto.email}`);

        try {
            // 1. Create the lead record
            const lead = await this.prisma.lead.create({
                data: {
                    email: dto.email,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    companyName: dto.companyName,
                    jobTitle: dto.jobTitle,
                    phone: dto.phone,
                    source: 'web_form',
                    sourceDetail: 'Public Contact Form',
                    originalMessage: dto.message,
                    productsOfInterest: dto.productsOfInterest,
                    stage: 'NEW',
                    status: 'ACTIVE',
                },
            });

            this.logger.log(`Created lead: ${lead.id}`);

            // 1b. Trigger AI Pipeline (Research -> Qualification)
            try {
                this.agentOrchestrator.processNewLead(lead.id).catch(err => {
                    this.logger.error(`Failed to trigger AI pipeline: ${err.message}`, err.stack);
                });
            } catch (e) {
                this.logger.error('Failed to trigger AI pipeline', e);
            }

            // 2. Log the lead creation activity
            await this.prisma.activity.create({
                data: {
                    leadId: lead.id,
                    type: 'LEAD_CREATED',
                    content: `New lead from contact form: ${dto.firstName} ${dto.lastName} from ${dto.companyName}`,
                    automated: true,
                    metadata: {
                        source: 'web_form',
                        productsOfInterest: dto.productsOfInterest,
                    },
                },
            });

            // 3. Get product documents for selected products
            const productDocuments = this.productDocumentService.getDocumentsForProducts(
                dto.productsOfInterest
            );

            // Get Company Profile (Always included)
            const companyProfile = this.productDocumentService.getCompanyProfilePath();

            // Prepare attachments
            const attachments = [];

            if (companyProfile) {
                attachments.push({
                    filename: companyProfile.filename,
                    path: companyProfile.path,
                    contentType: companyProfile.contentType,
                });
            }

            productDocuments.forEach(doc => {
                attachments.push({
                    filename: doc.filename,
                    path: doc.path,
                    contentType: doc.contentType,
                });
            });

            // 4. Build the acknowledgment email
            const emailHtml = this.buildAcknowledgmentEmail(dto, productDocuments, lead.id, !!companyProfile);

            // 5. Send the acknowledgment email
            const emailResult = await this.emailService.sendEmail(
                {
                    to: dto.email,
                    subject: `Thank you for your interest in TachyHealth - ${dto.productsOfInterest.join(', ')}`,
                    html: emailHtml,
                    attachments,
                    metadata: {
                        leadId: lead.id,
                        type: 'acknowledgment',
                        products: dto.productsOfInterest,
                    },
                },
                lead.id
            );

            if (emailResult.success) {
                this.logger.log(`Acknowledgment email sent to ${dto.email}`);

                // Log document sent activity if documents were attached
                if (attachments.length > 0) {
                    await this.prisma.activity.create({
                        data: {
                            leadId: lead.id,
                            type: 'DOCUMENT_SENT',
                            content: `Documents sent: ${attachments.map(d => d.filename).join(', ')}`,
                            automated: true,
                            metadata: {
                                documents: attachments.map(d => d.filename),
                                emailMessageId: emailResult.messageId,
                            },
                        },
                    });
                }
            } else {
                this.logger.warn(`Failed to send acknowledgment email: ${emailResult.error}`);
            }

            return {
                success: true,
                leadId: lead.id,
                message: 'Thank you for your inquiry! We have received your request and will be in touch shortly.',
                emailSent: emailResult.success,
                documentsAttached: attachments.map(d => d.filename),
            };

        } catch (error) {
            this.logger.error('Failed to process lead intake', error);
            return {
                success: false,
                message: 'We encountered an error processing your request. Please try again or contact us directly.',
            };
        }
    }

    /**
     * Build the HTML content for the acknowledgment email
     */
    private buildAcknowledgmentEmail(
        dto: LeadIntakeDto,
        productDocs: Array<{ displayName: string; filename: string }>,
        leadId: string,
        hasCompanyProfile: boolean
    ): string {
        const webUrl = this.configService.get<string>('WEB_URL') || 'http://localhost:3000';
        const productList = dto.productsOfInterest
            .map(p => {
                const info = this.productDocumentService.getProduct(p);
                return info ? `<li><strong>${info.displayName}</strong>: ${info.description}</li>` : '';
            })
            .join('');

        let attachmentsText = '';
        if (hasCompanyProfile || productDocs.length > 0) {
            attachmentsText = `<div class="highlight">
                <h3>Attached Resources:</h3>
                <ul>`;

            if (hasCompanyProfile) {
                attachmentsText += `<li><strong>TachyHealth Company Profile</strong> - Overview of our mission and capabilities.</li>`;
            }

            productDocs.forEach(d => {
                attachmentsText += `<li><strong>${d.displayName} Brochure</strong> - Detailed product specifications.</li>`;
            });

            attachmentsText += `</ul></div>`;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .highlight { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TachyHealth</h1>
            <p>AI-Powered Healthcare Solutions</p>
        </div>
        <div class="content">
            <h2>Hello ${dto.firstName},</h2>
            
            <p>Thank you for reaching out to TachyHealth! We've received your inquiry and are excited to learn more about how we can help <strong>${dto.companyName}</strong>.</p>
            
            ${attachmentsText}

            <p>Based on your interest in <strong>${dto.productsOfInterest.join(', ')}</strong>, we believe our solutions can significantly impact your workflow.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${webUrl}/book-demo?leadId=${leadId}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Schedule Your Discovery Call
                </a>
                <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
                    Prefer to talk now? Pick a time that works for you.
                </p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ol>
                <li>A member of our team will review your inquiry within 24 hours</li>
                <li>We'll reach out to schedule a discovery call at your convenience</li>
                <li>We'll prepare a customized demo based on your specific needs</li>
            </ol>

            <p>In the meantime, explore our attached resources to learn more.</p>

            <p>Best regards,<br>
            <strong>The TachyHealth Team</strong></p>
        </div>
        <div class="footer">
            <p>TachyHealth, Inc. | AI-Powered Claims Processing</p>
            <p>This email was sent in response to your inquiry on our website.</p>
        </div>
    </div>
</body>
</html>
        `;
    }
}
