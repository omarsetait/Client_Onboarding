import { Injectable } from '@nestjs/common';
import { ActivityType, Channel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityService {
    constructor(private readonly prisma: PrismaService) { }

    async log(
        leadId: string,
        type: ActivityType,
        options: {
            channel?: Channel;
            subject?: string;
            content?: string;
            metadata?: Record<string, any>;
            automated?: boolean;
            performedById?: string;
        } = {},
    ) {
        return this.prisma.activity.create({
            data: {
                leadId,
                type,
                channel: options.channel,
                subject: options.subject,
                content: options.content,
                metadata: options.metadata,
                automated: options.automated ?? true,
                performedById: options.performedById,
            },
        });
    }

    async getByLead(leadId: string, limit = 50) {
        return this.prisma.activity.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                performedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }

    async getRecent(limit = 100) {
        return this.prisma.activity.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                lead: {
                    select: { id: true, firstName: true, lastName: true, companyName: true },
                },
                performedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
}
