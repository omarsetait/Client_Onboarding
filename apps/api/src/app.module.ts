import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { LeadModule } from './modules/lead/lead.module';
import { UserModule } from './modules/user/user.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AiAgentsModule } from './modules/ai-agents/ai-agents.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { JobsModule } from './jobs/jobs.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AiAgentsController } from './modules/ai-agents/ai-agents.controller';
import { DocumentModule } from './modules/documents/document.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.local'],
        }),

        // Bull Queue for background jobs
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                redis: {
                    host: configService.get('REDIS_HOST', 'localhost'),
                    port: configService.get('REDIS_PORT', 6379),
                },
            }),
            inject: [ConfigService],
        }),

        // Database
        PrismaModule,

        // Real-time notifications (global)
        NotificationsModule,

        // Phase 1 modules
        AuthModule,
        LeadModule,
        UserModule,
        ActivityModule,

        // Phase 2 modules - AI & Communication
        AiAgentsModule,
        CommunicationModule,
        WorkflowModule,

        // Phase 2 modules - Calendar & Automation
        CalendarModule,
        WebhooksModule,
        JobsModule,

        // Phase 3 modules - Documents & Integrations
        DocumentModule,
        IntegrationsModule,
    ],
    controllers: [HealthController, AiAgentsController],
})
export class AppModule { }



