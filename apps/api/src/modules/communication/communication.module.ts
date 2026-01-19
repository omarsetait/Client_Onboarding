import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { SequenceService } from './sequence.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [ConfigModule, PrismaModule],
    providers: [
        EmailService,
        EmailTemplateService,
        SequenceService,
    ],
    exports: [EmailService, EmailTemplateService, SequenceService],
})
export class CommunicationModule { }
