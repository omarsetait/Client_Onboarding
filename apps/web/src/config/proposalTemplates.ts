/**
 * Proposal Template Definitions
 * 
 * These templates define the structure and default content for proposals.
 * The `content` JSON field in the Proposal model stores which template
 * was used and any customizations.
 */

export interface ProposalTemplate {
    id: string;
    name: string;
    description: string;
    sections: ProposalSection[];
    styling: ProposalStyling;
}

export interface ProposalSection {
    type: 'header' | 'introduction' | 'services' | 'pricing' | 'timeline' | 'terms' | 'signature' | 'cover' | 'custom_section';
    title: string;
    content?: string;
    visible: boolean;
    metadata?: any;
}

export interface ProposalStyling {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    logoUrl?: string;
}

export const defaultStyling: ProposalStyling = {
    primaryColor: '#6366f1', // Indigo
    accentColor: '#1e1b4b',
    fontFamily: 'Inter, sans-serif',
    logoUrl: '/logo.svg',
};

export const proposalTemplates: ProposalTemplate[] = [
    {
        id: 'technical',
        name: 'Technical Implementation Proposal',
        description: 'Detailed technical proposal with architecture and roadmap',
        sections: [
            {
                type: 'cover',
                title: 'Cover Page',
                content: 'Technical Proposal',
                visible: true,
            },
            {
                type: 'introduction',
                title: 'Executive Summary',
                content: 'We propose a scalable, AI-driven solution designed to meet your specific technical requirements and performance goals.',
                visible: true,
            },
            {
                type: 'custom_section',
                title: 'Solution Architecture',
                content: 'Our solution utilizes a modern microservices architecture to ensure scalability, reliability, and security.',
                metadata: {
                    icon: 'architecture',
                    subsections: [
                        { title: 'Frontend', text: 'React-based responsive application with Material UI for a consistent user experience.' },
                        { title: 'Backend', text: 'Node.js/NestJS API services running on Docker containers for easy deployment.' },
                        { title: 'AI Engine', text: 'Python-based machine learning models for intelligent data processing and insights.' },
                    ],
                },
                visible: true,
            },
            {
                type: 'timeline',
                title: 'Implementation Roadmap',
                metadata: {
                    phases: [
                        { name: 'Discovery', duration: '2 weeks' },
                        { name: 'Development', duration: '6 weeks' },
                        { name: 'UAT & Training', duration: '2 weeks' },
                        { name: 'Go-Live', duration: '1 week' },
                    ],
                },
                visible: true,
            },
            {
                type: 'pricing',
                title: 'Investment Summary',
                visible: true,
            },
            {
                type: 'signature',
                title: 'Authorization',
                visible: true,
            },
        ],
        styling: defaultStyling,
    },
];

export function getTemplateById(id: string): ProposalTemplate | undefined {
    return proposalTemplates.find(t => t.id === id);
}

export function getDefaultTemplate(): ProposalTemplate {
    return proposalTemplates[0];
}
