import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [DocumentController],
    providers: [PdfGeneratorService],
    exports: [PdfGeneratorService],
})
export class DocumentModule { }
