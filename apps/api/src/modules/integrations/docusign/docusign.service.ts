import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';

interface Signer {
    email: string;
    name: string;
    recipientId: string;
    routingOrder?: number;
}

interface CreateEnvelopeOptions {
    documentId: string;
    signers: Signer[];
    subject: string;
    message?: string;
    returnUrl?: string;
}

export interface EnvelopeStatus {
    envelopeId: string;
    status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
    statusDateTime: Date;
    recipients: {
        email: string;
        name: string;
        status: string;
        signedDateTime?: Date;
    }[];
}

@Injectable()
export class DocuSignService {
    private readonly logger = new Logger(DocuSignService.name);
    private readonly isConfigured: boolean;
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) {
        const integrationKey = this.configService.get('DOCUSIGN_INTEGRATION_KEY');
        const userId = this.configService.get('DOCUSIGN_USER_ID');
        const accountId = this.configService.get('DOCUSIGN_ACCOUNT_ID');

        this.isConfigured = !!(integrationKey && userId && accountId);

        if (!this.isConfigured) {
            this.logger.warn('DocuSign not configured - e-signature features will be simulated');
        }
    }

    /**
     * Create and send an envelope for signature
     */
    async createEnvelope(options: CreateEnvelopeOptions): Promise<string> {
        const document = await this.prisma.document.findUnique({
            where: { id: options.documentId },
            include: { lead: true },
        });

        if (!document) {
            throw new NotFoundException(`Document ${options.documentId} not found`);
        }

        if (!this.isConfigured) {
            // Simulate DocuSign in dev mode
            return this.simulateEnvelope(document, options);
        }

        // Real DocuSign API integration would go here
        // For now, we'll simulate the response
        return this.simulateEnvelope(document, options);
    }

    /**
     * Simulate DocuSign envelope creation for development
     */
    private async simulateEnvelope(document: any, options: CreateEnvelopeOptions): Promise<string> {
        const fakeEnvelopeId = `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.logger.log(`[SIMULATED] DocuSign envelope created: ${fakeEnvelopeId}`);
        this.logger.log(`[SIMULATED] Document: ${document.title}`);
        this.logger.log(`[SIMULATED] Signers: ${options.signers.map(s => s.email).join(', ')}`);

        // Update document with simulated envelope info
        await this.prisma.document.update({
            where: { id: options.documentId },
            data: {
                externalId: fakeEnvelopeId,
                signatureStatus: 'PENDING',
                status: 'SENT',
                signers: options.signers.map(s => ({
                    email: s.email,
                    name: s.name,
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                })),
            },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                type: 'DOCUMENT_SENT',
                leadId: document.leadId,
                metadata: {
                    action: 'docusign_envelope_created',
                    envelopeId: fakeEnvelopeId,
                    documentId: document.id,
                    signers: options.signers.map(s => s.email),
                },
            },
        });

        return fakeEnvelopeId;
    }

    /**
     * Get envelope status
     */
    async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatus | null> {
        const document = await this.prisma.document.findFirst({
            where: { externalId: envelopeId },
        });

        if (!document) {
            return null;
        }

        // In production, would call DocuSign API
        // For now, return simulated status from database
        const signers = (document.signers as any[]) || [];

        return {
            envelopeId,
            status: this.mapSignatureStatus(document.signatureStatus),
            statusDateTime: document.updatedAt,
            recipients: signers.map(s => ({
                email: s.email,
                name: s.name,
                status: s.status,
                signedDateTime: s.signedAt ? new Date(s.signedAt) : undefined,
            })),
        };
    }

    /**
     * Handle DocuSign webhook (Connect)
     */
    async handleWebhook(payload: any): Promise<void> {
        const envelopeId = payload.envelopeId || payload.data?.envelopeId;
        const status = payload.status || payload.data?.envelopeSummary?.status;

        if (!envelopeId) {
            this.logger.warn('DocuSign webhook received without envelope ID');
            return;
        }

        this.logger.log(`DocuSign webhook: envelope ${envelopeId} status: ${status}`);

        const document = await this.prisma.document.findFirst({
            where: { externalId: envelopeId },
            include: { lead: true },
        });

        if (!document) {
            this.logger.warn(`Document not found for envelope: ${envelopeId}`);
            return;
        }

        // Map DocuSign status to our status
        let signatureStatus: 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED' | null = null;
        let documentStatus: 'SENT' | 'SIGNED' | 'REJECTED' | 'EXPIRED' = 'SENT';

        switch (status?.toLowerCase()) {
            case 'completed':
            case 'signed':
                signatureStatus = 'SIGNED';
                documentStatus = 'SIGNED';
                break;
            case 'declined':
                signatureStatus = 'DECLINED';
                documentStatus = 'REJECTED';
                break;
            case 'voided':
            case 'expired':
                signatureStatus = 'EXPIRED';
                documentStatus = 'EXPIRED';
                break;
            case 'sent':
            case 'delivered':
                signatureStatus = 'PENDING';
                documentStatus = 'SENT';
                break;
        }

        // Update document
        await this.prisma.document.update({
            where: { id: document.id },
            data: {
                signatureStatus,
                status: documentStatus,
                signedAt: signatureStatus === 'SIGNED' ? new Date() : undefined,
            },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                type: 'DOCUMENT_SIGNED',
                leadId: document.leadId,
                metadata: {
                    action: 'docusign_status_update',
                    envelopeId,
                    status,
                    documentId: document.id,
                },
            },
        });

        // If signed, potentially trigger next workflow step
        if (signatureStatus === 'SIGNED') {
            this.logger.log(`Document ${document.id} signed! Triggering post-signature workflow...`);
            // Could trigger: invoice creation, deal stage update, etc.
        }
    }

    /**
     * Simulate a signature (for testing)
     */
    async simulateSignature(documentId: string): Promise<void> {
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException(`Document ${documentId} not found`);
        }

        // Update document as signed
        await this.prisma.document.update({
            where: { id: documentId },
            data: {
                signatureStatus: 'SIGNED',
                status: 'SIGNED',
                signedAt: new Date(),
                signers: ((document.signers as any[]) || []).map(s => ({
                    ...s,
                    status: 'signed',
                    signedAt: new Date().toISOString(),
                })),
            },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                type: 'DOCUMENT_SIGNED',
                leadId: document.leadId,
                metadata: {
                    action: 'signature_simulated',
                    documentId: document.id,
                },
            },
        });

        // Get lead info for notification
        const lead = await this.prisma.lead.findUnique({
            where: { id: document.leadId },
        });

        // Send real-time notification
        if (lead) {
            await this.notificationsService.notifyDocumentSigned({
                documentId: document.id,
                documentName: document.title,
                documentType: document.type,
                leadId: document.leadId,
                leadName: `${lead.firstName} ${lead.lastName}`,
                companyName: lead.companyName,
                signedAt: new Date(),
                assignedUserId: lead.assignedToId || undefined,
            });
        }

        this.logger.log(`[SIMULATED] Document ${documentId} signed`);
    }

    /**
     * Generate signing URL for embedded signing
     */
    async getSigningUrl(documentId: string, signerEmail: string, returnUrl: string): Promise<string> {
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException(`Document ${documentId} not found`);
        }

        if (!this.isConfigured) {
            // Return simulated signing URL
            const simulatedUrl = `${returnUrl}?event=signing_complete&documentId=${documentId}&simulated=true`;
            this.logger.log(`[SIMULATED] Signing URL generated for ${signerEmail}`);
            return simulatedUrl;
        }

        // In production, would call DocuSign API to get recipient view URL
        return `${returnUrl}?event=signing_complete&documentId=${documentId}`;
    }

    /**
     * Download signed document
     */
    async downloadSignedDocument(documentId: string): Promise<Buffer | null> {
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document || document.signatureStatus !== 'SIGNED') {
            return null;
        }

        if (document.fileUrl && fs.existsSync(document.fileUrl)) {
            return fs.readFileSync(document.fileUrl);
        }

        // In production, would download from DocuSign
        return null;
    }

    private mapSignatureStatus(status: string | null): EnvelopeStatus['status'] {
        switch (status) {
            case 'SIGNED': return 'completed';
            case 'DECLINED': return 'declined';
            case 'EXPIRED': return 'voided';
            case 'PENDING': return 'sent';
            default: return 'created';
        }
    }
}
