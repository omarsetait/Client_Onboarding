import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Res,
    UseGuards,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PdfGeneratorService, DocumentTemplate } from './pdf-generator.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import { EmailService } from '../communication/email.service';
import { NotificationsService } from '../notifications/notifications.service';

export class GenerateDocumentDto {
    @IsString()
    template: DocumentTemplate;

    @IsString()
    leadId: string;

    @IsOptional()
    @IsObject()
    customData?: Record<string, any>;
}

export class SendDocumentDto {
    @IsOptional()
    @IsString()
    recipientEmail?: string;

    @IsOptional()
    @IsString()
    subject?: string;

    @IsOptional()
    @IsString()
    message?: string;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
    constructor(
        private readonly pdfGenerator: PdfGeneratorService,
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Generate a new document from template
     */
    @Post('generate')
    async generateDocument(@Body() dto: GenerateDocumentDto) {
        const { fileUrl, documentId } = await this.pdfGenerator.generateDocument(
            dto.template,
            dto.leadId,
            dto.customData,
        );

        return {
            success: true,
            documentId,
            message: `${dto.template} document generated successfully`,
            downloadUrl: `/api/v1/documents/${documentId}/download`,
        };
    }

    /**
     * Get all documents
     */
    @Get()
    async getAllDocuments() {
        const documents = await this.prisma.document.findMany({
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
            orderBy: { createdAt: 'desc' },
        });

        // Transform to frontend-expected format
        return {
            documents: documents.map(doc => ({
                id: doc.id,
                name: doc.title,
                type: doc.type,
                category: doc.type,
                status: doc.status,
                fileSize: doc.fileSize,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                lead: doc.lead,
            })),
        };
    }

    /**
     * Get document by ID
     */
    @Get(':id')
    async getDocument(@Param('id') id: string) {
        const document = await this.prisma.document.findUnique({
            where: { id },
            include: {
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        email: true,
                    },
                },
            },
        });

        if (!document) {
            throw new NotFoundException(`Document ${id} not found`);
        }

        return {
            ...document,
            name: document.title,
        };
    }

    /**
     * Download document PDF
     */
    @Get(':id/download')
    async downloadDocument(@Param('id') id: string, @Res() res: Response) {
        const document = await this.prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            throw new NotFoundException(`Document ${id} not found`);
        }

        if (!document.fileUrl || !fs.existsSync(document.fileUrl)) {
            throw new NotFoundException('Document file not found');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.title}.pdf"`);

        const fileStream = fs.createReadStream(document.fileUrl);
        fileStream.pipe(res);
    }

    /**
     * Send document to lead via email
     */
    @Post(':id/send')
    async sendDocument(
        @Param('id') id: string,
        @Body() dto: SendDocumentDto,
    ) {
        const document = await this.prisma.document.findUnique({
            where: { id },
            include: { lead: true },
        });

        if (!document) {
            throw new NotFoundException(`Document ${id} not found`);
        }

        const recipientEmail = dto.recipientEmail || document.lead?.email;
        if (!recipientEmail) {
            throw new NotFoundException('No recipient email provided');
        }

        if (!document.fileUrl || !fs.existsSync(document.fileUrl)) {
            throw new NotFoundException('Document file not found');
        }

        const subject = dto.subject || `TachyHealth ${document.type} for ${document.lead?.companyName || 'your review'}`;
        const message = dto.message || `Hi ${document.lead?.firstName || 'there'},<br /><br />Please find your document attached. Let us know if you have any questions.<br /><br />— TachyHealth Team`;

        const sendResult = await this.emailService.sendEmail({
            to: recipientEmail,
            subject,
            html: `<div style="font-family: Arial, sans-serif;">${message}</div>`,
            attachments: [
                {
                    filename: `${document.title}.pdf`,
                    path: document.fileUrl,
                    contentType: 'application/pdf',
                },
            ],
            trackOpens: true,
            trackClicks: true,
            metadata: { type: 'document_send', documentId: document.id },
        }, document.leadId || undefined);

        if (!sendResult.success) {
            throw new BadRequestException(sendResult.error || 'Failed to send document');
        }

        await this.prisma.document.update({
            where: { id },
            data: { status: 'SENT' },
        });

        await this.prisma.activity.create({
            data: {
                type: 'DOCUMENT_SENT',
                leadId: document.leadId,
                metadata: {
                    documentId: document.id,
                    documentTitle: document.title,
                    recipientEmail,
                    description: `Document "${document.title}" sent to ${recipientEmail}`,
                },
            },
        });

        if (document.type === 'PROPOSAL' && document.lead) {
            const previousStage = document.lead?.stage || 'PROPOSAL_SENT';

            if (previousStage !== 'NEGOTIATION') {
                await this.prisma.$transaction(async (tx) => {
                    await tx.lead.update({
                        where: { id: document.leadId },
                        data: { stage: 'NEGOTIATION' },
                    });

                    await tx.stageHistory.create({
                        data: {
                            leadId: document.leadId,
                            fromStage: previousStage,
                            toStage: 'NEGOTIATION',
                            reason: 'Proposal sent',
                            automated: true,
                        },
                    });

                    await tx.activity.create({
                        data: {
                            leadId: document.leadId,
                            type: 'STAGE_CHANGED',
                            content: `Stage changed from ${previousStage} to NEGOTIATION`,
                            metadata: { documentId: document.id, trigger: 'proposal_sent' },
                            automated: true,
                        },
                    });
                });
            }

            await this.notificationsService.notifyLeadUpdate({
                leadId: document.leadId,
                type: 'STAGE_CHANGE',
                message: `Proposal sent to ${document.lead.companyName}`,
                data: { documentId: document.id, stage: 'NEGOTIATION' },
            });
        }

        return {
            success: true,
            message: `Document sent to ${recipientEmail}`,
            documentId: id,
        };
    }

    /**
     * Get documents for a specific lead
     */
    @Get('lead/:leadId')
    async getLeadDocuments(@Param('leadId') leadId: string) {
        const documents = await this.prisma.document.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
        });

        return {
            documents: documents.map(doc => ({
                id: doc.id,
                name: doc.title,
                type: doc.type,
                category: doc.type,
                status: doc.status,
                fileSize: doc.fileSize,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            })),
        };
    }
}
