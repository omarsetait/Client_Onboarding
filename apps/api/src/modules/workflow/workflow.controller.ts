import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowService } from './workflow.service';

type LeadStage = 'NEW' | 'QUALIFYING' | 'HOT_ENGAGED' | 'WARM_NURTURING' | 'COLD_ARCHIVED' | 'MEETING_SCHEDULED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST' | 'DISQUALIFIED';

class TransitionDto {
    stage: LeadStage;
    reason?: string;
}

@ApiTags('Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow')
export class WorkflowController {
    constructor(private readonly workflowService: WorkflowService) { }

    @Get('leads/:id/history')
    @ApiOperation({ summary: 'Get stage history for a lead' })
    async getStageHistory(@Param('id') leadId: string) {
        return this.workflowService.getStageHistory(leadId);
    }

    @Get('leads/:id/transitions')
    @ApiOperation({ summary: 'Get available transitions for a lead' })
    async getAvailableTransitions(@Param('id') leadId: string) {
        const transitions = this.workflowService.getAvailableTransitions('NEW');
        return { transitions };
    }

    @Post('leads/:id/transition')
    @ApiOperation({ summary: 'Transition lead to a new stage' })
    async transitionLead(
        @Param('id') leadId: string,
        @Body() dto: TransitionDto,
    ) {
        return this.workflowService.transitionStage(leadId, dto.stage, dto.reason);
    }
}
