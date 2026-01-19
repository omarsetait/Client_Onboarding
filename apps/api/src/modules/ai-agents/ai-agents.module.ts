import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CoordinatorAgent } from './coordinator/coordinator.agent';
import { QualificationAgent } from './qualification/qualification.agent';
import { CommunicationAgent } from './communication/communication.agent';
import { SchedulingAgent } from './scheduling/scheduling.agent';
import { ResearchAgent } from './research/research.agent';
import { DocumentAgent } from './document/document.agent';
import { AnalyticsAgent } from './analytics/analytics.agent';
import { AgentOrchestrator } from './orchestrator.service';
import { AiAgentsController } from './ai-agents.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        BullModule.registerQueue(
            { name: 'agent-tasks' },
            { name: 'email-queue' },
            { name: 'enrichment-queue' },
        ),
    ],
    providers: [
        AgentOrchestrator,
        CoordinatorAgent,
        QualificationAgent,
        CommunicationAgent,
        SchedulingAgent,
        ResearchAgent,
        DocumentAgent,
        AnalyticsAgent,
    ],
    controllers: [AiAgentsController],
    exports: [AgentOrchestrator],
})
export class AiAgentsModule { }
