import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LeadController } from './lead.controller';
import { PublicLeadController } from './public-lead.controller';
import { LeadService } from './lead.service';
import { LeadIntakeService } from './lead-intake.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationModule } from '../communication/communication.module';
import { DocumentModule } from '../documents/document.module';
import { AiAgentsModule } from '../ai-agents/ai-agents.module';

@Module({
    imports: [
        PrismaModule,
        CommunicationModule,
        DocumentModule,
        AiAgentsModule,
        BullModule.registerQueue({ name: 'agent-tasks' }),
    ],
    controllers: [LeadController, PublicLeadController],
    providers: [LeadService, LeadIntakeService],
    exports: [LeadService, LeadIntakeService],
})
export class LeadModule { }

