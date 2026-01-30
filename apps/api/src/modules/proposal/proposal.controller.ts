import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProposalService, CreateProposalDto, UpdateProposalDto, CreateProposalItemDto } from './proposal.service';
import { ProposalStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { extname, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

// Hardcoded user for demo (in production, use @CurrentUser decorator)
const DEMO_USER_ID = 'e80ba4b0-8781-42e2-90a1-65febe138b32';

@ApiTags('Proposals')
@Controller('proposals')
export class ProposalController {
    constructor(private readonly proposalService: ProposalService) { }


    @Post()
    @ApiOperation({ summary: 'Create a new proposal' })
    async create(@Body() dto: CreateProposalDto) {
        return this.proposalService.create(DEMO_USER_ID, dto);
    }

    @Post('upload')
    @ApiOperation({ summary: 'Upload a proposal document' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: any) {
        if (!file) throw new BadRequestException('File is required');

        // Validation
        if (!file.originalname.match(/\.(pdf|doc|docx)$/)) {
            throw new BadRequestException('Only PDF and Word documents are allowed!');
        }

        // In Vercel (serverless), use /tmp (ephemeral) or external storage
        const isVercel = process.env.VERCEL === '1';
        const uploadDir = isVercel ? '/tmp/uploads' : './uploads';

        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        const filename = `${randomName}${extname(file.originalname)}`;
        const filePath = join(uploadDir, filename);

        writeFileSync(filePath, file.buffer);

        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        return {
            url: `${baseUrl}/uploads/${filename}`,
            filename: file.originalname,
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all proposals' })
    @ApiQuery({ name: 'leadId', required: false })
    @ApiQuery({ name: 'status', required: false, enum: ProposalStatus })
    async findAll(
        @Query('leadId') leadId?: string,
        @Query('status') status?: ProposalStatus,
    ) {
        return this.proposalService.findAll({ leadId, status });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a proposal by ID' })
    async findOne(@Param('id') id: string) {
        return this.proposalService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a proposal' })
    async update(@Param('id') id: string, @Body() dto: UpdateProposalDto) {
        return this.proposalService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a proposal' })
    async delete(@Param('id') id: string) {
        return this.proposalService.delete(id);
    }

    // === Item Management ===
    @Post(':id/items')
    @ApiOperation({ summary: 'Add an item to a proposal' })
    async addItem(@Param('id') id: string, @Body() item: CreateProposalItemDto) {
        return this.proposalService.addItem(id, item);
    }

    @Delete(':id/items/:itemId')
    @ApiOperation({ summary: 'Remove an item from a proposal' })
    async removeItem(
        @Param('id') id: string,
        @Param('itemId') itemId: string,
    ) {
        return this.proposalService.removeItem(id, itemId);
    }

    // === Status Transitions ===
    @Post(':id/send')
    @ApiOperation({ summary: 'Mark a proposal as SENT manually (Trigger System Flow)' })
    async send(@Param('id') id: string) {
        // Per new workflow, "Send" now means "Mark as Sent"
        return this.proposalService.markAsSent(id);
    }

    @Post(':id/accept')
    @ApiOperation({ summary: 'Mark proposal as accepted' })
    async accept(@Param('id') id: string) {
        return this.proposalService.accept(id);
    }

    @Post(':id/decline')
    @ApiOperation({ summary: 'Mark proposal as declined' })
    async decline(@Param('id') id: string) {
        return this.proposalService.decline(id);
    }
}
