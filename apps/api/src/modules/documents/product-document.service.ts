import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Product types available in TachyHealth
 */
export type ProductType = 'AiReview' | 'AiPharma' | 'AiCode' | 'AiAudit' | 'AiPolicy' | 'AiCare';

/**
 * Product information including document mapping
 */
export interface ProductInfo {
    name: ProductType;
    displayName: string;
    description: string;
    documentFilename: string;
    contentType: string;
}

/**
 * Service for managing product documents (brochures, info sheets)
 * that are sent to leads based on their product interest
 */
@Injectable()
export class ProductDocumentService {
    private readonly logger = new Logger(ProductDocumentService.name);
    private readonly documentsDir: string;

    /**
     * Product catalog with document mappings
     */
    private readonly products: Record<ProductType, ProductInfo> = {
        AiReview: {
            name: 'AiReview',
            displayName: 'AI Review',
            description: 'AI-powered claims review and validation',
            documentFilename: 'aireview_brochure.pdf',
            contentType: 'application/pdf',
        },
        AiPharma: {
            name: 'AiPharma',
            displayName: 'AI Pharma',
            description: 'Pharmacy claims automation and validation',
            documentFilename: 'aipharma_brochure.pptx',
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
        AiCode: {
            name: 'AiCode',
            displayName: 'AI Code',
            description: 'Intelligent medical coding assistance',
            documentFilename: 'aicode_brochure.pptx',
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
        AiAudit: {
            name: 'AiAudit',
            displayName: 'AI Audit',
            description: 'Automated claims audit and compliance',
            documentFilename: 'aiaudit_brochure.pdf',
            contentType: 'application/pdf',
        },
        AiPolicy: {
            name: 'AiPolicy',
            displayName: 'AI Policy',
            description: 'Policy compliance and checking automation',
            documentFilename: 'aipolicy_brochure.pdf',
            contentType: 'application/pdf',
        },
        AiCare: {
            name: 'AiCare',
            displayName: 'AI Care',
            description: 'Patient care pathway optimization with Humain',
            documentFilename: 'aicare_brochure.pptx',
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
    };

    constructor() {
        // In Vercel (serverless), only /tmp is writable
        const isVercel = process.env.VERCEL === '1';
        const baseDir = isVercel ? '/tmp' : process.cwd();

        this.documentsDir = path.join(baseDir, 'product-documents');

        // Ensure documents directory exists
        if (!fs.existsSync(this.documentsDir)) {
            try {
                fs.mkdirSync(this.documentsDir, { recursive: true });
                this.logger.log(`Created product documents directory: ${this.documentsDir}`);
            } catch (error) {
                this.logger.warn(`Failed to create product documents directory: ${error.message}`);
            }
        }
    }

    /**
     * Get all available products
     */
    getAllProducts(): ProductInfo[] {
        return Object.values(this.products);
    }

    /**
     * Get product info by name
     */
    getProduct(productName: ProductType): ProductInfo | undefined {
        return this.products[productName];
    }

    /**
     * Get path to Company Profile
     */
    getCompanyProfilePath(): { path: string, filename: string, contentType: string } | null {
        const filename = 'company_profile.pptx';
        const docPath = path.join(this.documentsDir, filename);

        if (!fs.existsSync(docPath)) {
            this.logger.warn(`Company profile not found: ${docPath}`);
            return null;
        }

        return {
            path: docPath,
            filename: 'Company Profile.pptx', // User friendly name
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
    }

    /**
     * Get the full path to a product's document
     */
    getDocumentPath(productName: ProductType): string | null {
        const product = this.products[productName];
        if (!product) {
            this.logger.warn(`Unknown product: ${productName}`);
            return null;
        }

        const docPath = path.join(this.documentsDir, product.documentFilename);

        if (!fs.existsSync(docPath)) {
            this.logger.warn(`Document not found for ${productName}: ${docPath}`);
            return null;
        }

        return docPath;
    }

    /**
     * Get documents for multiple products
     * Returns array of { productName, path, filename } for existing documents
     */
    getDocumentsForProducts(productNames: ProductType[]): Array<{
        productName: ProductType;
        path: string;
        filename: string;
        displayName: string;
        contentType: string;
    }> {
        const documents: Array<{
            productName: ProductType;
            path: string;
            filename: string;
            displayName: string;
            contentType: string;
        }> = [];

        for (const productName of productNames) {
            // Check if productName exists in our map (ignore random case mismatches for safety if needed, but DTO should handle)
            // But cast to ProductType carefully
            const product = this.products[productName as ProductType];
            if (!product) continue;

            const docPath = path.join(this.documentsDir, product.documentFilename);

            if (fs.existsSync(docPath)) {
                documents.push({
                    productName: productName as ProductType,
                    path: docPath,
                    filename: product.documentFilename,
                    displayName: product.displayName,
                    contentType: product.contentType,
                });
            } else {
                this.logger.warn(`Document missing for ${productName} (${docPath}), skipping attachment`);
            }
        }

        return documents;
    }

    /**
     * Check if a document exists for a product
     */
    hasDocument(productName: ProductType): boolean {
        const docPath = this.getDocumentPath(productName);
        return docPath !== null;
    }

    /**
     * Get list of missing documents (for admin diagnostics)
     */
    getMissingDocuments(): ProductType[] {
        return Object.keys(this.products).filter(
            (key) => !this.hasDocument(key as ProductType)
        ) as ProductType[];
    }
}
