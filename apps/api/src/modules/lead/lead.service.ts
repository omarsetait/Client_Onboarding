import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, LeadStage, LeadStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto, UpdateLeadDto, LeadQueryDto, UpdateLeadStageDto } from './dto';

@Injectable()
export class LeadService {
    private readonly logger = new Logger(LeadService.name);

    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
    ) { }

    async create(dto: CreateLeadDto, source: string = 'api') {
        // Check for duplicate within 24 hours
        const existingLead = await this.prisma.lead.findFirst({
            where: {
                email: dto.email.toLowerCase(),
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
                deletedAt: null,
            },
        });

        if (existingLead) {
            // Update existing lead with new data instead of creating duplicate
            return this.update(existingLead.id, {
                ...dto,
                originalMessage: existingLead.originalMessage
                    ? `${existingLead.originalMessage}\n---\n${dto.originalMessage || ''}`
                    : dto.originalMessage,
            });
        }

        const lead = await this.prisma.lead.create({
            data: {
                email: dto.email.toLowerCase(),
                firstName: dto.firstName,
                lastName: dto.lastName,
                companyName: dto.companyName,
                companyDomain: dto.companyDomain || this.extractDomain(dto.email),
                phone: dto.phone,
                jobTitle: dto.jobTitle,
                industry: dto.industry,
                country: dto.country,
                region: dto.region,
                city: dto.city,
                source,
                sourceDetail: dto.sourceDetail,
                utmSource: dto.utmSource,
                utmMedium: dto.utmMedium,
                utmCampaign: dto.utmCampaign,
                landingPage: dto.landingPage,
                originalMessage: dto.originalMessage,
                productsOfInterest: dto.productsOfInterest || [],
                stage: LeadStage.NEW,
                status: LeadStatus.ACTIVE,
                score: 0,
            },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                leadId: lead.id,
                type: 'LEAD_CREATED',
                content: `Lead created from ${source}`,
                automated: true,
            },
        });

        // AUTO-TRIGGER: Queue for AI processing pipeline
        try {
            this.logger.log(`🔄 Attempting to queue lead ${lead.id} for AI processing...`);
            const job = await this.agentQueue.add('new-lead-pipeline', { leadId: lead.id });
            this.logger.log(`✅ Lead ${lead.id} queued successfully. Job ID: ${job.id}`);
        } catch (error) {
            this.logger.error(`❌ Failed to queue lead ${lead.id} for processing:`, error);
        }

        return lead;
    }

    async findAll(query: LeadQueryDto) {
        const {
            page = 1,
            limit = 25,
            search,
            stage,
            status,
            scoreMin,
            scoreMax,
            assignedToId,
            source,
            industry,
            country,
            createdFrom,
            createdTo,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;

        const where: Prisma.LeadWhereInput = {
            deletedAt: null,
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { companyName: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(stage && { stage }),
            ...(status && { status }),
            ...(scoreMin !== undefined && { score: { gte: scoreMin } }),
            ...(scoreMax !== undefined && { score: { lte: scoreMax } }),
            ...(assignedToId && { assignedToId }),
            ...(source && { source }),
            ...(industry && { industry }),
            ...(country && { country }),
            ...(createdFrom && { createdAt: { gte: new Date(createdFrom) } }),
            ...(createdTo && { createdAt: { lte: new Date(createdTo) } }),
        };

        const [leads, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                include: {
                    assignedTo: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    documents: {
                        where: { type: 'PROPOSAL' },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { status: true },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.lead.count({ where }),
        ]);

        const leadsWithProposalStatus = leads.map((lead) => {
            const latestProposal = lead.documents?.[0];
            const proposalSent = latestProposal?.status === 'SENT';
            const { documents, ...rest } = lead as any;
            return { ...rest, proposalSent };
        });

        return {
            data: leadsWithProposalStatus,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        };
    }

    async findOne(id: string) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdBy: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                },
                meetings: {
                    orderBy: { startTime: 'desc' },
                    take: 10,
                },
                documents: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                stageHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
                proposals: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                        createdBy: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return lead;
    }

    async update(id: string, dto: UpdateLeadDto) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return this.prisma.lead.update({
            where: { id },
            data: {
                ...dto,
                updatedAt: new Date(),
            },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });
    }

    async updateStage(id: string, dto: UpdateLeadStageDto, userId?: string) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        // Update lead stage
        const updatedLead = await this.prisma.lead.update({
            where: { id },
            data: {
                stage: dto.stage,
                updatedAt: new Date(),
            },
        });

        // Record stage history
        await this.prisma.stageHistory.create({
            data: {
                leadId: id,
                fromStage: lead.stage,
                toStage: dto.stage,
                reason: dto.reason,
                changedById: userId,
                automated: !userId,
            },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                leadId: id,
                type: 'STAGE_CHANGED',
                content: `Stage changed from ${lead.stage} to ${dto.stage}`,
                metadata: { fromStage: lead.stage, toStage: dto.stage, reason: dto.reason },
                automated: !userId,
                performedById: userId,
            },
        });

        return updatedLead;
    }

    async assign(id: string, assignedToId: string, assignedById?: string) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: assignedToId },
        });

        if (!user) {
            throw new BadRequestException(`User with ID ${assignedToId} not found`);
        }

        const updatedLead = await this.prisma.lead.update({
            where: { id },
            data: {
                assignedToId,
                assignedAt: new Date(),
            },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                leadId: id,
                type: 'ASSIGNMENT_CHANGED',
                content: `Lead assigned to ${user.firstName} ${user.lastName}`,
                metadata: { assignedToId, assignedToName: `${user.firstName} ${user.lastName}` },
                automated: false,
                performedById: assignedById,
            },
        });

        return updatedLead;
    }

    async delete(id: string) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        // Soft delete
        return this.prisma.lead.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async getTimeline(id: string, limit = 50) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return this.prisma.activity.findMany({
            where: { leadId: id },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                performedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }

    async addNote(id: string, content: string, userId: string, isPrivate = false) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
        });

        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        const note = await this.prisma.note.create({
            data: {
                leadId: id,
                content,
                isPrivate,
                createdById: userId,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        // Log activity
        await this.prisma.activity.create({
            data: {
                leadId: id,
                type: 'NOTE_ADDED',
                content: 'Note added',
                automated: false,
                performedById: userId,
            },
        });

        return note;
    }

    private extractDomain(email: string): string {
        const parts = email.split('@');
        return parts.length > 1 ? parts[1] : '';
    }
}
