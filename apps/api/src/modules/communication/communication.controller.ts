import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications')
export class CommunicationController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @ApiOperation({ summary: 'Get all communications' })
    async getCommunications() {
        const communications = await this.prisma.communication.findMany({
            include: {
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        companyName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return { communications };
    }
}
