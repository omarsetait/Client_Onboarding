import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadDto, UpdateLeadDto, LeadQueryDto, UpdateLeadStageDto, AssignLeadDto, AddNoteDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeadController {
    constructor(private readonly leadService: LeadService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new lead' })
    @ApiResponse({ status: 201, description: 'Lead created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    async create(@Body() dto: CreateLeadDto, @Req() req: any) {
        return this.leadService.create(dto, 'api');
    }

    @Get()
    @ApiOperation({ summary: 'Get all leads with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
    async findAll(@Query() query: LeadQueryDto) {
        return this.leadService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a lead by ID' })
    @ApiParam({ name: 'id', description: 'Lead UUID' })
    @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async findOne(@Param('id') id: string) {
        return this.leadService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a lead' })
    @ApiParam({ name: 'id', description: 'Lead UUID' })
    @ApiResponse({ status: 200, description: 'Lead updated successfully' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
        return this.leadService.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'MANAGER')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a lead (soft delete)' })
    @ApiParam({ name: 'id', description: 'Lead UUID' })
    @ApiResponse({ status: 204, description: 'Lead deleted successfully' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async delete(@Param('id') id: string) {
        return this.leadService.delete(id);
    }

    @Post(':id/stage')
    @ApiOperation({ summary: 'Update lead stage' })
    @ApiParam({ name: 'id', description: 'Lead UUID' })
    @ApiResponse({ status: 200, description: 'Stage updated successfully' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async updateStage(
        @Param('id') id: string,
        @Body() dto: UpdateLeadStageDto,
        @Req() req: any,
    ) {
        return this.leadService.updateStage(id, dto, req.user.id);
    }

    @Post(':id/assign')
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Assign lead to a sales rep' })
    @ApiParam({ name: 'id', description: 'Lead UUID' })
    @ApiResponse({ status: 200, description: 'Lead assigned successfully' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async assign(
        @Param('id') id: string,
        @Body() dto: AssignLeadDto,
        @Req() req: any,
    ) {
        return this.leadService.assign(id, dto.assignedToId, req.user.id);
    }

    @Get(':id/timeline')
    @ApiOperation({ summary: 'Get lead activity timeline' })
    @ApiParam({ name: 'id', description: 'Lead UUID' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Timeline retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async getTimeline(
        @Param('id') id: string,
        @Query('limit') limit?: number,
    ) {
        return this.leadService.getTimeline(id, limit);
    }

    @Post(':id/notes')
    @ApiOperation({ summary: 'Add a note to a lead' })
    @ApiParam({ name: 'id', description: 'Lead UUID' })
    @ApiResponse({ status: 201, description: 'Note added successfully' })
    @ApiResponse({ status: 404, description: 'Lead not found' })
    async addNote(
        @Param('id') id: string,
        @Body() dto: AddNoteDto,
        @Req() req: any,
    ) {
        return this.leadService.addNote(id, dto.content, req.user.id, dto.isPrivate);
    }
}
