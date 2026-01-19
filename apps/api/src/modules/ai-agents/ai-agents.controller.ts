import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentOrchestrator } from './orchestrator.service';

class ExecuteAgentDto {
    agent: string;
    leadId: string;
    input?: Record<string, unknown>;
}

class GenerateEmailDto {
    leadId: string;
    type: 'acknowledgment' | 'follow_up' | 'demo_offer' | 'case_study' | 'break_up';
}

@ApiTags('AI Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiAgentsController {
    constructor(private readonly orchestrator: AgentOrchestrator) { }

    @Post('leads/:id/process')
    @ApiOperation({ summary: 'Process lead through AI pipeline' })
    async processLead(@Param('id') leadId: string) {
        await this.orchestrator.processNewLead(leadId);
        return { success: true, message: 'Lead queued for AI processing' };
    }

    @Get('leads/:id/recommendation')
    @ApiOperation({ summary: 'Get AI recommendation for next action' })
    async getRecommendation(@Param('id') leadId: string) {
        return this.orchestrator.getRecommendation(leadId);
    }

    @Post('leads/:id/score')
    @ApiOperation({ summary: 'Score lead using AI qualification agent' })
    async scoreLead(@Param('id') leadId: string) {
        return this.orchestrator.scoreLead(leadId);
    }

    @Post('leads/:id/email')
    @ApiOperation({ summary: 'Generate personalized email for lead' })
    @ApiBody({ type: GenerateEmailDto })
    async generateEmail(
        @Param('id') leadId: string,
        @Body() dto: GenerateEmailDto,
    ) {
        return this.orchestrator.generateEmail(leadId, dto.type);
    }

    @Post('execute')
    @ApiOperation({ summary: 'Execute specific AI agent' })
    @ApiBody({ type: ExecuteAgentDto })
    async executeAgent(@Body() dto: ExecuteAgentDto) {
        return this.orchestrator.executeAgent(dto.agent, dto.input, {
            leadId: dto.leadId,
        });
    }
}
