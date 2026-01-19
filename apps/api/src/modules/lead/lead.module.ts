import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue({ name: 'agent-tasks' }),
    ],
    controllers: [LeadController],
    providers: [LeadService],
    exports: [LeadService],
})
export class LeadModule { }
