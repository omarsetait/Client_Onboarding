import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { AutoSchedulerService } from './auto-scheduler.service';
import { NoShowDetectionService } from './no-show-detection.service';
import { MeetingPrepService } from './meeting-prep.service';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { PublicCalendarController } from './public-calendar.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationModule } from '../communication/communication.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        CommunicationModule,
        ScheduleModule.forRoot(),
        BullModule.registerQueue({ name: 'agent-tasks' }),
    ],
    providers: [
        MicrosoftGraphService,
        AutoSchedulerService,
        NoShowDetectionService,
        MeetingPrepService,
        CalendarService,
    ],
    controllers: [CalendarController, PublicCalendarController],
    exports: [
        MicrosoftGraphService,
        AutoSchedulerService,
        NoShowDetectionService,
        MeetingPrepService,
        CalendarService,
    ],
})
export class CalendarModule { }
