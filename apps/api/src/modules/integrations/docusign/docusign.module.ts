import { Module } from '@nestjs/common';
import { DocuSignController } from './docusign.controller';
import { DocuSignService } from './docusign.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [DocuSignController],
    providers: [DocuSignService],
    exports: [DocuSignService],
})
export class DocuSignModule { }
