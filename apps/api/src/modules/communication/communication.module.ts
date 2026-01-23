import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { SequenceService } from './sequence.service';
import { PrismaModule } from '../../prisma/prisma.module';

import { CommunicationController } from './communication.controller';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [CommunicationController],
    providers: [
        EmailService,
        EmailTemplateService,
        SequenceService,
    ],
    exports: [EmailService, EmailTemplateService, SequenceService],
})
export class CommunicationModule { }
