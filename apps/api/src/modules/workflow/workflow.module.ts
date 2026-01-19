import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [WorkflowService],
    controllers: [WorkflowController],
    exports: [WorkflowService],
})
export class WorkflowModule { }
