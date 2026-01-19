import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export type DocumentTemplate = 'PROPOSAL' | 'CONTRACT' | 'INVOICE' | 'QUOTE';

interface ProposalData {
    leadId: string;
    companyName: string;
    contactName: string;
    email: string;
    industry: string;
    proposedSolution: string;
    pricing: {
        setup: number;
        monthly: number;
        perClaim?: number;
    };
    features: string[];
    timeline: string;
    validUntil: Date;
}

interface ContractData {
    leadId: string;
    companyName: string;
    contactName: string;
    email: string;
    address?: string;
    contractTerms: {
        startDate: Date;
        endDate: Date;
        value: number;
        paymentTerms: string;
    };
    services: string[];
}

interface InvoiceData {
    leadId: string;
    invoiceNumber: string;
    companyName: string;
    contactName: string;
    email: string;
    address?: string;
    lineItems: {
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
    dueDate: Date;
    notes?: string;
}

@Injectable()
export class PdfGeneratorService {
    private readonly logger = new Logger(PdfGeneratorService.name);
    private readonly outputDir: string;

    constructor(private readonly prisma: PrismaService) {
        // Create output directory for generated PDFs
        this.outputDir = path.join(process.cwd(), 'generated-documents');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate a PDF document from a template
     */
    async generateDocument(
        template: DocumentTemplate,
        leadId: string,
        customData?: Partial<ProposalData | ContractData | InvoiceData>,
    ): Promise<{ fileUrl: string; documentId: string }> {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: { assignedTo: true },
        });

        if (!lead) {
            throw new NotFoundException(`Lead ${leadId} not found`);
        }

        let fileUrl: string;
        let documentTitle: string;

        switch (template) {
            case 'PROPOSAL':
                const proposalData = this.buildProposalData(lead, customData as Partial<ProposalData>);
                fileUrl = await this.generateProposal(proposalData);
                documentTitle = `Proposal - ${lead.companyName}`;
                break;
            case 'CONTRACT':
                const contractData = this.buildContractData(lead, customData as Partial<ContractData>);
                fileUrl = await this.generateContract(contractData);
                documentTitle = `Service Agreement - ${lead.companyName}`;
                break;
            case 'INVOICE':
                const invoiceData = this.buildInvoiceData(lead, customData as Partial<InvoiceData>);
                fileUrl = await this.generateInvoice(invoiceData);
                documentTitle = `Invoice - ${lead.companyName}`;
                break;
            case 'QUOTE':
                const quoteData = this.buildProposalData(lead, customData as Partial<ProposalData>);
                fileUrl = await this.generateProposal(quoteData);
                documentTitle = `Quote - ${lead.companyName}`;
                break;
            default:
                throw new Error(`Unknown template: ${template}`);
        }

        // Save document record to database
        const document = await this.prisma.document.create({
            data: {
                title: documentTitle,
                type: template,
                fileUrl: fileUrl,
                fileSize: fs.existsSync(fileUrl) ? fs.statSync(fileUrl).size : null,
                mimeType: 'application/pdf',
                status: 'DRAFT',
                leadId: leadId,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    template: template,
                },
            },
        });

        this.logger.log(`Generated ${template} document for lead ${leadId}: ${document.id}`);

        return { fileUrl, documentId: document.id };
    }

    /**
     * Generate a professional proposal PDF
     */
    private async generateProposal(data: ProposalData): Promise<string> {
        const fileName = `proposal_${data.leadId}_${Date.now()}.pdf`;
        const filePath = path.join(this.outputDir, fileName);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // Header with company branding
            this.addHeader(doc, 'PROPOSAL');

            // Title
            doc.fontSize(24).fillColor('#1a365d')
                .text('Business Proposal', { align: 'center' });
            doc.moveDown();

            // Client Information
            doc.fontSize(14).fillColor('#2d3748')
                .text(`Prepared for: ${data.companyName}`, { align: 'center' });
            doc.fontSize(12).fillColor('#718096')
                .text(`Attention: ${data.contactName}`, { align: 'center' });
            doc.text(`Industry: ${data.industry}`, { align: 'center' });
            doc.moveDown(2);

            // Executive Summary
            this.addSection(doc, 'Executive Summary');
            doc.fontSize(11).fillColor('#4a5568')
                .text(
                    `TachyHealth is pleased to present this proposal for ${data.companyName}. ` +
                    `Our AI-powered claims processing platform is designed to streamline your operations, ` +
                    `reduce errors, and accelerate reimbursement cycles.`,
                    { align: 'justify' }
                );
            doc.moveDown();

            // Proposed Solution
            this.addSection(doc, 'Proposed Solution');
            doc.fontSize(11).fillColor('#4a5568')
                .text(data.proposedSolution || 'Custom AI-powered claims automation platform tailored to your needs.', { align: 'justify' });
            doc.moveDown();

            // Features
            this.addSection(doc, 'Key Features');
            data.features.forEach(feature => {
                doc.fontSize(11).fillColor('#4a5568')
                    .text(`• ${feature}`, { indent: 20 });
            });
            doc.moveDown();

            // Pricing
            this.addSection(doc, 'Investment');
            doc.fontSize(11).fillColor('#4a5568');

            const pricingTable = [
                ['Description', 'Amount'],
                ['One-time Setup & Implementation', `$${data.pricing.setup.toLocaleString()}`],
                ['Monthly Platform Fee', `$${data.pricing.monthly.toLocaleString()}/mo`],
            ];

            if (data.pricing.perClaim) {
                pricingTable.push(['Per-Claim Processing', `$${data.pricing.perClaim}/claim`]);
            }

            this.drawTable(doc, pricingTable, 150);
            doc.moveDown();

            // Timeline
            this.addSection(doc, 'Implementation Timeline');
            doc.fontSize(11).fillColor('#4a5568')
                .text(data.timeline || 'Typical implementation: 4-6 weeks from contract signing.');
            doc.moveDown();

            // Validity
            doc.fontSize(10).fillColor('#718096')
                .text(`This proposal is valid until: ${data.validUntil.toLocaleDateString()}`, { align: 'center' });

            // Footer
            this.addFooter(doc);

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        });
    }

    /**
     * Generate a service contract PDF
     */
    private async generateContract(data: ContractData): Promise<string> {
        const fileName = `contract_${data.leadId}_${Date.now()}.pdf`;
        const filePath = path.join(this.outputDir, fileName);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            this.addHeader(doc, 'SERVICE AGREEMENT');

            doc.fontSize(20).fillColor('#1a365d')
                .text('Master Service Agreement', { align: 'center' });
            doc.moveDown(2);

            // Parties
            this.addSection(doc, 'PARTIES');
            doc.fontSize(11).fillColor('#4a5568')
                .text('This Service Agreement ("Agreement") is entered into by and between:');
            doc.moveDown(0.5);
            doc.text('TachyHealth, Inc. ("Provider")', { indent: 20 });
            doc.text(`${data.companyName} ("Client")`, { indent: 20 });
            if (data.address) {
                doc.fontSize(10).fillColor('#718096')
                    .text(data.address, { indent: 20 });
            }
            doc.moveDown();

            // Term
            this.addSection(doc, 'TERM');
            doc.fontSize(11).fillColor('#4a5568')
                .text(
                    `This Agreement shall commence on ${data.contractTerms.startDate.toLocaleDateString()} ` +
                    `and continue until ${data.contractTerms.endDate.toLocaleDateString()}, ` +
                    `unless terminated earlier in accordance with this Agreement.`
                );
            doc.moveDown();

            // Services
            this.addSection(doc, 'SERVICES');
            doc.fontSize(11).fillColor('#4a5568')
                .text('Provider agrees to provide the following services:');
            data.services.forEach((service, index) => {
                doc.text(`${index + 1}. ${service}`, { indent: 20 });
            });
            doc.moveDown();

            // Compensation
            this.addSection(doc, 'COMPENSATION');
            doc.fontSize(11).fillColor('#4a5568')
                .text(`Total Contract Value: $${data.contractTerms.value.toLocaleString()}`);
            doc.text(`Payment Terms: ${data.contractTerms.paymentTerms}`);
            doc.moveDown();

            // Standard Terms (abbreviated)
            this.addSection(doc, 'GENERAL TERMS');
            const terms = [
                'Confidentiality: Both parties agree to maintain confidentiality of proprietary information.',
                'Data Security: Provider shall maintain appropriate security measures for Client data.',
                'Limitation of Liability: Liability is limited to fees paid under this Agreement.',
                'Termination: Either party may terminate with 30 days written notice.',
            ];
            terms.forEach(term => {
                doc.fontSize(10).fillColor('#4a5568')
                    .text(`• ${term}`, { indent: 10 });
            });
            doc.moveDown(2);

            // Signature Lines
            this.addSection(doc, 'SIGNATURES');
            doc.moveDown();

            // Two columns for signatures
            const signatureY = doc.y;
            doc.fontSize(10).fillColor('#4a5568');

            // Provider signature
            doc.text('TachyHealth, Inc.', 50, signatureY);
            doc.text('_________________________', 50, signatureY + 40);
            doc.text('Authorized Signature', 50, signatureY + 55);
            doc.text('Date: _____________', 50, signatureY + 70);

            // Client signature
            doc.text(data.companyName, 320, signatureY);
            doc.text('_________________________', 320, signatureY + 40);
            doc.text('Authorized Signature', 320, signatureY + 55);
            doc.text('Date: _____________', 320, signatureY + 70);

            this.addFooter(doc);
            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        });
    }

    /**
     * Generate an invoice PDF
     */
    private async generateInvoice(data: InvoiceData): Promise<string> {
        const fileName = `invoice_${data.invoiceNumber}_${Date.now()}.pdf`;
        const filePath = path.join(this.outputDir, fileName);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            this.addHeader(doc, 'INVOICE');

            // Invoice details
            doc.fontSize(10).fillColor('#718096')
                .text(`Invoice #: ${data.invoiceNumber}`, { align: 'right' });
            doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
            doc.text(`Due Date: ${data.dueDate.toLocaleDateString()}`, { align: 'right' });
            doc.moveDown(2);

            // Bill to
            this.addSection(doc, 'Bill To');
            doc.fontSize(11).fillColor('#4a5568')
                .text(data.companyName);
            doc.text(data.contactName);
            doc.text(data.email);
            if (data.address) doc.text(data.address);
            doc.moveDown(2);

            // Line items table
            const tableData = [
                ['Description', 'Qty', 'Unit Price', 'Total'],
                ...data.lineItems.map(item => [
                    item.description,
                    item.quantity.toString(),
                    `$${item.unitPrice.toLocaleString()}`,
                    `$${(item.quantity * item.unitPrice).toLocaleString()}`
                ])
            ];

            this.drawTable(doc, tableData, 100);

            // Total
            const total = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            doc.moveDown();
            doc.fontSize(14).fillColor('#1a365d')
                .text(`Total Due: $${total.toLocaleString()}`, { align: 'right' });
            doc.moveDown(2);

            // Payment info
            this.addSection(doc, 'Payment Information');
            doc.fontSize(10).fillColor('#4a5568')
                .text('Please make payment to:');
            doc.text('TachyHealth, Inc.', { indent: 20 });
            doc.text('Bank: First National Bank', { indent: 20 });
            doc.text('Account: XXXX-XXXX-1234', { indent: 20 });
            doc.text('Routing: XXXXX-567', { indent: 20 });

            if (data.notes) {
                doc.moveDown();
                doc.fontSize(10).fillColor('#718096')
                    .text(`Notes: ${data.notes}`);
            }

            this.addFooter(doc);
            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        });
    }

    // Helper methods
    private addHeader(doc: PDFKit.PDFDocument, docType: string): void {
        doc.fontSize(10).fillColor('#718096')
            .text('TACHYHEALTH', 50, 30);
        doc.fontSize(8)
            .text('AI-Powered Healthcare Claims Processing', 50, 42);
        doc.fontSize(8).fillColor('#a0aec0')
            .text(docType, 500, 35, { align: 'right' });
        doc.moveTo(50, 60).lineTo(550, 60).stroke('#e2e8f0');
        doc.moveDown(3);
    }

    private addFooter(doc: PDFKit.PDFDocument): void {
        const pageHeight = doc.page.height;
        doc.fontSize(8).fillColor('#a0aec0')
            .text(
                'TachyHealth, Inc. | 123 Innovation Way, San Francisco, CA 94105 | contact@tachyhealth.com',
                50, pageHeight - 50, { align: 'center' }
            );
    }

    private addSection(doc: PDFKit.PDFDocument, title: string): void {
        doc.fontSize(14).fillColor('#1a365d')
            .text(title);
        doc.moveTo(doc.x, doc.y).lineTo(doc.x + 100, doc.y).stroke('#3182ce');
        doc.moveDown(0.5);
    }

    private drawTable(doc: PDFKit.PDFDocument, data: string[][], startY: number): void {
        const colWidths = [250, 60, 90, 90];
        const rowHeight = 25;
        let y = startY;

        data.forEach((row, rowIndex) => {
            let x = 50;
            row.forEach((cell, colIndex) => {
                if (rowIndex === 0) {
                    doc.fontSize(10).fillColor('#1a365d').text(cell, x, y, { width: colWidths[colIndex] });
                } else {
                    doc.fontSize(10).fillColor('#4a5568').text(cell, x, y, { width: colWidths[colIndex] });
                }
                x += colWidths[colIndex];
            });
            y += rowHeight;
            if (rowIndex === 0) {
                doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke('#e2e8f0');
            }
        });
        doc.y = y;
    }

    private buildProposalData(lead: any, custom?: Partial<ProposalData>): ProposalData {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        return {
            leadId: lead.id,
            companyName: lead.companyName,
            contactName: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            industry: lead.industry || 'Healthcare',
            proposedSolution: custom?.proposedSolution ||
                'TachyHealth AI Platform - Automated claims processing with 99.5% accuracy, ' +
                'reducing processing time by 75% and denials by 40%.',
            pricing: custom?.pricing || {
                setup: 15000,
                monthly: 2500,
                perClaim: 0.25,
            },
            features: custom?.features || [
                'AI-powered claims validation and coding',
                'Real-time eligibility verification',
                'Automated denial management',
                'Custom analytics dashboard',
                'HIPAA-compliant secure processing',
                '24/7 technical support',
            ],
            timeline: custom?.timeline || 'Implementation: 4-6 weeks',
            validUntil: custom?.validUntil || validUntil,
        };
    }

    private buildContractData(lead: any, custom?: Partial<ContractData>): ContractData {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        return {
            leadId: lead.id,
            companyName: lead.companyName,
            contactName: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            address: custom?.address,
            contractTerms: custom?.contractTerms || {
                startDate,
                endDate,
                value: 45000,
                paymentTerms: 'Net 30',
            },
            services: custom?.services || [
                'AI Claims Processing Platform Access',
                'Implementation and Configuration',
                'Staff Training (up to 20 users)',
                'API Integration Support',
                'Ongoing Technical Support',
            ],
        };
    }

    private buildInvoiceData(lead: any, custom?: Partial<InvoiceData>): InvoiceData {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        return {
            leadId: lead.id,
            invoiceNumber: custom?.invoiceNumber || `INV-${Date.now().toString().slice(-8)}`,
            companyName: lead.companyName,
            contactName: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            address: custom?.address,
            lineItems: custom?.lineItems || [
                { description: 'Platform Setup & Implementation', quantity: 1, unitPrice: 15000 },
                { description: 'Monthly Platform Fee', quantity: 1, unitPrice: 2500 },
            ],
            dueDate: custom?.dueDate || dueDate,
            notes: custom?.notes,
        };
    }
}
