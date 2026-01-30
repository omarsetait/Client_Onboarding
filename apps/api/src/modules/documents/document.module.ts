import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { ProductDocumentService } from './product-document.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationModule } from '../communication/communication.module';

@Module({
    imports: [PrismaModule, CommunicationModule],
    controllers: [DocumentController],
    providers: [PdfGeneratorService, ProductDocumentService],
    exports: [PdfGeneratorService, ProductDocumentService],
})
export class DocumentModule { }
