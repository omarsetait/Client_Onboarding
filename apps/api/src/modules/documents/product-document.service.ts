import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Product types available in TachyHealth
 */
export type ProductType = 'AiReview' | 'AiPharma' | 'AiCode' | 'AiAudit' | 'AiPolicy';

/**
 * Product information including document mapping
 */
export interface ProductInfo {
    name: ProductType;
    displayName: string;
    description: string;
    documentFilename: string;
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
        },
        AiPharma: {
            name: 'AiPharma',
            displayName: 'AI Pharma',
            description: 'Pharmacy claims automation and validation',
            documentFilename: 'aipharma_brochure.pdf',
        },
        AiCode: {
            name: 'AiCode',
            displayName: 'AI Code',
            description: 'Intelligent medical coding assistance',
            documentFilename: 'aicode_brochure.pdf',
        },
        AiAudit: {
            name: 'AiAudit',
            displayName: 'AI Audit',
            description: 'Automated claims audit and compliance',
            documentFilename: 'aiaudit_brochure.pdf',
        },
        AiPolicy: {
            name: 'AiPolicy',
            displayName: 'AI Policy',
            description: 'Policy compliance and checking automation',
            documentFilename: 'aipolicy_brochure.pdf',
        },
    };

    constructor() {
        this.documentsDir = path.join(process.cwd(), 'product-documents');

        // Ensure documents directory exists
        if (!fs.existsSync(this.documentsDir)) {
            fs.mkdirSync(this.documentsDir, { recursive: true });
            this.logger.log(`Created product documents directory: ${this.documentsDir}`);
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
    }> {
        const documents: Array<{
            productName: ProductType;
            path: string;
            filename: string;
            displayName: string;
        }> = [];

        for (const productName of productNames) {
            const product = this.products[productName];
            if (!product) continue;

            const docPath = path.join(this.documentsDir, product.documentFilename);

            if (fs.existsSync(docPath)) {
                documents.push({
                    productName,
                    path: docPath,
                    filename: product.documentFilename,
                    displayName: product.displayName,
                });
            } else {
                this.logger.warn(`Document missing for ${productName}, skipping attachment`);
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
