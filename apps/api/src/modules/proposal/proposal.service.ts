import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ProposalStatus, LeadStage, ProposalType } from '@prisma/client';
import { EmailService } from '../communication/email.service';
import { LeadService } from '../lead/lead.service';

export interface CreateProposalDto {
    leadId: string;
    title: string;
    validUntil?: string;
    currency?: string;
    notes?: string;
    items?: CreateProposalItemDto[];
    attachmentUrl?: string; // Manual upload URL
    totalAmount?: number; // Manual amount override
    type?: ProposalType;
}

export interface CreateProposalItemDto {
    productName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
}

export interface UpdateProposalDto {
    title?: string;
    validUntil?: string;
    currency?: string;
    notes?: string;
    status?: ProposalStatus;
    attachmentUrl?: string;
    totalAmount?: number;
}

@Injectable()
export class ProposalService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private leadService: LeadService,
    ) { }

    async create(createdById: string, dto: CreateProposalDto) {
        const { items, ...proposalData } = dto;

        // Calculate total from items OR use manual override
        let totalAmount = dto.totalAmount || 0;

        const itemsToCreate = items?.map((item, index) => {
            const amount = item.quantity * item.unitPrice;
            // If items exist, they dictate the total (re-summing)
            // Unless we strictly want manual override. 
            // For now, if items exist, we sum them. If not, we keep the manual amount.
            return {
                productName: item.productName,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: amount,
                sortOrder: index,
            };
        }) || [];

        if (itemsToCreate.length > 0) {
            totalAmount = itemsToCreate.reduce((sum, item) => sum + item.amount, 0);
        }

        // Handle TECHNICAL type override (force 0 amount, null validation)
        if (dto.type === 'TECHNICAL') {
            totalAmount = 0;
            proposalData.validUntil = undefined;
        }

        return this.prisma.proposal.create({
            data: {
                leadId: proposalData.leadId,
                title: proposalData.title,
                validUntil: proposalData.validUntil ? new Date(proposalData.validUntil) : null,
                currency: proposalData.currency || 'USD',
                notes: proposalData.notes,
                attachmentUrl: proposalData.attachmentUrl,
                totalAmount: totalAmount,
                createdById: createdById,
                type: dto.type || 'COMMERCIAL',
                items: {
                    create: itemsToCreate,
                },
            },
            include: {
                items: true,
                lead: {
                    select: { id: true, firstName: true, lastName: true, companyName: true, email: true },
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });
    }

    async findAll(filters?: {
        leadId?: string;
        status?: ProposalStatus;
        createdById?: string;
    }) {
        const where: Prisma.ProposalWhereInput = {};

        if (filters?.leadId) where.leadId = filters.leadId;
        if (filters?.status) where.status = filters.status;
        if (filters?.createdById) where.createdById = filters.createdById;

        return this.prisma.proposal.findMany({
            where,
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
                lead: {
                    select: { id: true, firstName: true, lastName: true, companyName: true, email: true },
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const proposal = await this.prisma.proposal.findUnique({
            where: { id },
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
                lead: {
                    select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true },
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });

        if (!proposal) {
            throw new NotFoundException(`Proposal with ID ${id} not found`);
        }

        return proposal;
    }

    async update(id: string, dto: UpdateProposalDto) {
        await this.findOne(id); // Ensure exists

        return this.prisma.proposal.update({
            where: { id },
            data: {
                title: dto.title,
                validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
                currency: dto.currency,
                notes: dto.notes,
                status: dto.status,
                attachmentUrl: dto.attachmentUrl,
                totalAmount: dto.totalAmount, // Allow updating total amount directly
            },
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
                lead: {
                    select: { id: true, firstName: true, lastName: true, companyName: true, email: true },
                },
            },
        });
    }

    // ... (addItem/removeItem/recalculateTotal omitted for brevity but remain unchanged)

    async addItem(proposalId: string, item: CreateProposalItemDto) {
        const proposal = await this.findOne(proposalId);

        const amount = item.quantity * item.unitPrice;
        const maxSortOrder = proposal.items.length > 0
            ? Math.max(...proposal.items.map(i => i.sortOrder))
            : -1;

        const newItem = await this.prisma.proposalItem.create({
            data: {
                proposalId,
                productName: item.productName,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: amount,
                sortOrder: maxSortOrder + 1,
            },
        });

        // Recalculate total
        await this.recalculateTotal(proposalId);

        return newItem;
    }

    async removeItem(proposalId: string, itemId: string) {
        await this.prisma.proposalItem.delete({
            where: { id: itemId },
        });

        // Recalculate total
        await this.recalculateTotal(proposalId);
    }

    async recalculateTotal(proposalId: string) {
        const items = await this.prisma.proposalItem.findMany({
            where: { proposalId },
        });

        const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

        await this.prisma.proposal.update({
            where: { id: proposalId },
            data: { totalAmount: total },
        });
    }

    /**
     * Mark proposal as sent MANUALLY.
     * Triggers the lead stage update but DOES NOT send an email.
     */
    async markAsSent(id: string) {
        const proposal = await this.findOne(id);

        if (proposal.status !== 'DRAFT') {
            throw new BadRequestException('Only draft proposals can be marked as sent');
        }

        // 1. Update Proposal Status
        const updatedProposal = await this.prisma.proposal.update({
            where: { id },
            data: { status: 'SENT' },
        });

        // 2. Send Email
        const lead = proposal.lead;
        if (lead && lead.email) {
            const documentLink = proposal.attachmentUrl; // Assuming this is a full URL or relative path

            // Construct basic email content
            const subject = `Proposal: ${proposal.title}`;
            const html = `
                <p>Dear ${lead.firstName},</p>
                <p>Please find attached the proposal "${proposal.title}" for your review.</p>
                <p>You can view the document here: <a href="${documentLink}">${documentLink}</a></p>
                <p>Best regards,<br>TachyHealth Team</p>
            `;

            await this.emailService.sendEmail({
                to: lead.email,
                subject,
                html,
                metadata: { proposalId: id },
            }, proposal.leadId);
        }

        // 3. Update Lead Stage (Trigger the System Flow)
        await this.leadService.updateStage(
            proposal.leadId,
            {
                stage: 'PROPOSAL_SENT',
                reason: 'Proposal marked as sent manually (Email dispatched)',
            },
            proposal.createdById,
        );

        // 4. Log Activity
        await this.prisma.activity.create({
            data: {
                leadId: proposal.leadId,
                type: 'PROPOSAL_SENT',
                content: `Proposal "${proposal.title}" sent via email.`,
                metadata: { proposalId: id, manual: true, emailSent: !!lead?.email },
                performedById: proposal.createdById,
            },
        });

        return updatedProposal;
    }

    async send(id: string) {
        // Legacy "Automated Send" - keeping strictly for reference or if option B was chosen.
        // But per user request, we are moving to Manual.
        return this.markAsSent(id);
    }

    async markViewed(id: string) {
        const proposal = await this.findOne(id);

        if (proposal.status === 'SENT') {
            return this.prisma.proposal.update({
                where: { id },
                data: { status: 'VIEWED' },
            });
        }

        return proposal;
    }

    async accept(id: string) {
        return this.prisma.proposal.update({
            where: { id },
            data: { status: 'ACCEPTED' },
        });
    }

    async decline(id: string) {
        return this.prisma.proposal.update({
            where: { id },
            data: { status: 'DECLINED' },
        });
    }

    async delete(id: string) {
        await this.findOne(id); // Ensure exists
        return this.prisma.proposal.delete({ where: { id } });
    }
}
