import { Injectable } from '@nestjs/common';

interface TemplateVariables {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    jobTitle?: string;
    industry?: string;
    customFields?: Record<string, string>;
}

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: string;
}

@Injectable()
export class EmailTemplateService {
    private readonly defaultTemplates: EmailTemplate[] = [
        {
            id: 'acknowledgment',
            name: 'Inquiry Acknowledgment',
            type: 'acknowledgment',
            subject: 'Thanks for reaching out, {{firstName}}!',
            body: `
<p>Hi {{firstName}},</p>

<p>Thank you for your interest in TachyHealth! We received your inquiry and are excited to learn more about {{companyName}} and how we can help.</p>

<p>A member of our team will reach out within 24 hours to discuss your needs and answer any questions you may have.</p>

<p>In the meantime, feel free to:</p>
<ul>
  <li>Explore our <a href="https://tachyhealth.com/products">product solutions</a></li>
  <li>Read our <a href="https://tachyhealth.com/case-studies">customer success stories</a></li>
  <li>Check out our <a href="https://tachyhealth.com/blog">healthcare AI insights blog</a></li>
</ul>

<p>We look forward to connecting!</p>

<p>Best regards,<br>
The TachyHealth Team</p>
      `.trim(),
        },
        {
            id: 'demo-invite',
            name: 'Demo Invitation',
            type: 'demo_offer',
            subject: '{{firstName}}, see TachyHealth in action',
            body: `
<p>Hi {{firstName}},</p>

<p>I wanted to personally invite you to experience TachyHealth's AI-powered healthcare solutions in a personalized demo.</p>

<p>During our 30-minute session, you'll see:</p>
<ul>
  <li>How our AI processes claims 10x faster than traditional methods</li>
  <li>Real-time analytics tailored for {{industry}}</li>
  <li>Integration with your existing systems</li>
</ul>

<p><a href="https://calendly.com/tachyhealth/demo" style="background-color: #1F4E78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Schedule Your Demo</a></p>

<p>Looking forward to showing you what's possible!</p>

<p>Best,<br>
TachyHealth Team</p>
      `.trim(),
        },
        {
            id: 'follow-up-1',
            name: 'First Follow-up',
            type: 'follow_up',
            subject: 'Quick question, {{firstName}}',
            body: `
<p>Hi {{firstName}},</p>

<p>I wanted to follow up on my previous message. I understand you're busy, so I'll keep this brief.</p>

<p>Is {{companyName}} currently facing any of these challenges?</p>
<ul>
  <li>Processing backlogs in claims review</li>
  <li>Manual data entry errors</li>
  <li>Compliance documentation overhead</li>
</ul>

<p>If any of these resonate, I'd love to share how TachyHealth has helped similar organizations.</p>

<p>Just reply to this email or <a href="https://calendly.com/tachyhealth/call">book a quick call</a>.</p>

<p>Best,<br>
TachyHealth Team</p>
      `.trim(),
        },
    ];

    async getTemplate(templateId: string): Promise<EmailTemplate | null> {
        return this.defaultTemplates.find(t => t.id === templateId) || null;
    }

    async getAllTemplates(): Promise<EmailTemplate[]> {
        return this.defaultTemplates;
    }

    render(template: EmailTemplate, variables: TemplateVariables): { subject: string; body: string } {
        let subject = template.subject;
        let body = template.body;

        // Replace all variables
        const allVariables: Record<string, string> = {
            firstName: variables.firstName || 'there',
            lastName: variables.lastName || '',
            companyName: variables.companyName || 'your company',
            jobTitle: variables.jobTitle || '',
            industry: variables.industry || 'healthcare',
            ...variables.customFields,
        };

        for (const [key, value] of Object.entries(allVariables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, value);
            body = body.replace(regex, value);
        }

        return { subject, body };
    }
}
