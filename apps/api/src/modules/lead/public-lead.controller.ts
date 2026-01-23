import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeadIntakeService } from './lead-intake.service';
import { PublicLeadIntakeDto } from './dto/public-lead-intake.dto';
import { ProductDocumentService } from '../documents/product-document.service';

/**
 * Public controller for lead intake (no authentication required)
 * Handles contact form submissions from the public website
 */
@ApiTags('Public')
@Controller('public')
export class PublicLeadController {
    constructor(
        private readonly leadIntakeService: LeadIntakeService,
        private readonly productDocumentService: ProductDocumentService,
    ) { }

    /**
     * Get available products for the contact form dropdown
     */
    @Get('products')
    @ApiOperation({ summary: 'Get available products for contact form' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async getProducts() {
        const products = this.productDocumentService.getAllProducts();
        return {
            products: products.map(p => ({
                value: p.name,
                label: p.displayName,
                description: p.description,
            })),
        };
    }

    /**
     * Submit a lead from the public contact form
     */
    @Post('contact')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Submit contact form (public, no auth required)' })
    @ApiResponse({ status: 200, description: 'Lead submitted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    async submitContactForm(@Body() dto: PublicLeadIntakeDto) {
        const result = await this.leadIntakeService.processLeadIntake({
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            companyName: dto.companyName,
            jobTitle: dto.jobTitle,
            productsOfInterest: dto.productsOfInterest as any,
            message: dto.message,
        });

        return {
            success: result.success,
            message: result.message,
            emailSent: result.emailSent,
            documentsAttached: result.documentsAttached,
        };
    }
}
