import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LeadPipelineProcessor } from './lead-pipeline.processor';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiAgentsModule } from '../modules/ai-agents/ai-agents.module';
import { CommunicationModule } from '../modules/communication/communication.module';

@Module({
    imports: [
        PrismaModule,
        AiAgentsModule,
        CommunicationModule,
        BullModule.registerQueue({ name: 'agent-tasks' }),
    ],
    providers: [LeadPipelineProcessor, ScheduledJobsService],
    exports: [ScheduledJobsService],
})
export class JobsModule { }
