import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue({ name: 'agent-tasks' }),
    ],
    controllers: [WebhookController],
})
export class WebhooksModule { }
