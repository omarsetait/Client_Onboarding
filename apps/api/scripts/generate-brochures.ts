import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const productDocsDir = path.join(process.cwd(), 'product-documents');

if (!fs.existsSync(productDocsDir)) {
    fs.mkdirSync(productDocsDir, { recursive: true });
}

interface ProductBrochure {
    filename: string;
    title: string;
    description: string;
    features: string[];
}

const brochures: ProductBrochure[] = [
    {
        filename: 'aireview_brochure.pdf',
        title: 'AiReview',
        description: 'AI-Powered Claims Review & Validation',
        features: [
            'Automated clinical validation',
            'DRG verification and coding accuracy',
            'Real-time anomaly detection',
            'Integration with major EHR/HIS systems'
        ]
    },
    {
        filename: 'aipharma_brochure.pdf',
        title: 'AiPharma',
        description: 'Intelligent Pharmacy Benefit Management',
        features: [
            'Drug interaction checking',
            'Formulary compliance automation',
            'Prior authorization acceleration',
            'Fraud and waste detection'
        ]
    },
    {
        filename: 'aicode_brochure.pdf',
        title: 'AiCode',
        description: 'Automated Medical Coding Assistant',
        features: [
            'ICD-10/11 and CPT automated coding',
            'Documentation gap analysis',
            'Real-time coding audits',
            'Physician query automation'
        ]
    },
    {
        filename: 'aiaudit_brochure.pdf',
        title: 'AiAudit',
        description: 'Comprehensive Claims Audit Platform',
        features: [
            'Pre-payment claims auditing',
            'Recovery audit workflows',
            'Compliance monitoring dashboard',
            'Predictive denial management'
        ]
    },
    {
        filename: 'aipolicy_brochure.pdf',
        title: 'AiPolicy',
        description: 'Policy Management & Compliance',
        features: [
            'Automated policy update tracking',
            'Compliance rule engine',
            'Multi-payer guideline repository',
            'Audit trail generation'
        ]
    }
];

async function generateBrochure(brochure: ProductBrochure) {
    return new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const filePath = path.join(productDocsDir, brochure.filename);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc.fontSize(24).fillColor('#1a365d').text(brochure.title, { align: 'center' });
        doc.moveDown();

        doc.fontSize(16).fillColor('#2d3748').text('Product Brochure', { align: 'center' });
        doc.moveDown(2);

        // Description
        doc.fontSize(14).fillColor('#4a5568').text(brochure.description, { align: 'center' });
        doc.moveDown(2);

        // Features
        doc.fontSize(14).fillColor('#1a365d').text('Key Features:', { underline: true });
        doc.moveDown();

        doc.fontSize(12).fillColor('#2d3748');
        brochure.features.forEach(feature => {
            doc.text(`• ${feature}`, { indent: 20 });
            doc.moveDown(0.5);
        });

        doc.moveDown(3);
        doc.fontSize(10).fillColor('#718096')
            .text('© 2026 TachyHealth, Inc. All rights reserved.', { align: 'center', baseline: 'bottom' });

        doc.end();

        stream.on('finish', () => {
            console.log(`Generated: ${brochure.filename}`);
            resolve();
        });
        stream.on('error', reject);
    });
}

async function main() {
    console.log('Generating product brochures...');
    for (const brochure of brochures) {
        await generateBrochure(brochure);
    }
    console.log('Done!');
}

main().catch(console.error);
