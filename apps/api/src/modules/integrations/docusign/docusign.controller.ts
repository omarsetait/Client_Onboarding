import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocuSignService } from './docusign.service';

class SignerDto {
    @IsString()
    email: string;

    @IsString()
    name: string;
}

export class SendForSignatureDto {
    @IsString()
    documentId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SignerDto)
    signers: SignerDto[];

    @IsOptional()
    @IsString()
    subject?: string;

    @IsOptional()
    @IsString()
    message?: string;
}

export class GetSigningUrlDto {
    @IsString()
    email: string;

    @IsString()
    returnUrl: string;
}

@Controller('integrations/docusign')
export class DocuSignController {
    constructor(private readonly docuSignService: DocuSignService) { }

    /**
     * Send a document for e-signature
     */
    @Post('send')
    @UseGuards(JwtAuthGuard)
    async sendForSignature(@Body() dto: SendForSignatureDto) {
        const envelopeId = await this.docuSignService.createEnvelope({
            documentId: dto.documentId,
            signers: dto.signers.map((s, i) => ({
                ...s,
                recipientId: (i + 1).toString(),
            })),
            subject: dto.subject || 'Document for Signature',
            message: dto.message,
        });

        return {
            success: true,
            envelopeId,
            message: 'Document sent for signature',
        };
    }

    /**
     * Get envelope/document signature status
     */
    @Get('status/:envelopeId')
    @UseGuards(JwtAuthGuard)
    async getStatus(@Param('envelopeId') envelopeId: string) {
        const status = await this.docuSignService.getEnvelopeStatus(envelopeId);
        return { status };
    }

    /**
     * Get signing URL for embedded signing
     */
    @Get('signing-url/:documentId')
    @UseGuards(JwtAuthGuard)
    async getSigningUrl(
        @Param('documentId') documentId: string,
        @Query() query: GetSigningUrlDto,
    ) {
        const url = await this.docuSignService.getSigningUrl(
            documentId,
            query.email,
            query.returnUrl,
        );

        return { signingUrl: url };
    }

    /**
     * Simulate a signature (for testing only)
     */
    @Post('simulate-sign/:documentId')
    @UseGuards(JwtAuthGuard)
    async simulateSignature(@Param('documentId') documentId: string) {
        await this.docuSignService.simulateSignature(documentId);
        return {
            success: true,
            message: 'Signature simulated successfully',
        };
    }

    /**
     * DocuSign Connect webhook (no auth - called by DocuSign)
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() payload: any) {
        await this.docuSignService.handleWebhook(payload);
        return { received: true };
    }
}
