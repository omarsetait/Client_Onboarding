import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                timezone: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                timezone: true,
                isActive: true,
                mfaEnabled: true,
                preferences: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { assignedLeads: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
    }

    async update(id: string, dto: UpdateUserDto) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return this.prisma.user.update({
            where: { id },
            data: dto,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                timezone: true,
                isActive: true,
                preferences: true,
                updatedAt: true,
            },
        });
    }

    async deactivate(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async getAvailableReps() {
        return this.prisma.user.findMany({
            where: {
                deletedAt: null,
                isActive: true,
                role: { in: ['SALES_REP', 'MANAGER'] },
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                _count: {
                    select: { assignedLeads: { where: { status: 'ACTIVE' } } },
                },
            },
            orderBy: { firstName: 'asc' },
        });
    }
}
