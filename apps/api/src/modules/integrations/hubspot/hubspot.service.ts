import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

interface HubSpotContact {
    id?: string;
    email: string;
    firstname: string;
    lastname: string;
    company: string;
    jobtitle?: string;
    phone?: string;
    industry?: string;
    hs_lead_status?: string;
}

interface HubSpotDeal {
    id?: string;
    dealname: string;
    amount?: number;
    pipeline: string;
    dealstage: string;
    closedate?: string;
}

export interface SyncResult {
    success: boolean;
    hubspotId?: string;
    action: 'created' | 'updated' | 'skipped';
    message?: string;
}

@Injectable()
export class HubSpotService {
    private readonly logger = new Logger(HubSpotService.name);
    private readonly isConfigured: boolean;
    private readonly accessToken: string | null;
    private readonly baseUrl = 'https://api.hubapi.com';

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.accessToken = this.configService.get('HUBSPOT_ACCESS_TOKEN') || null;
        this.isConfigured = !!this.accessToken;

        if (!this.isConfigured) {
            this.logger.warn('HubSpot not configured - CRM sync will be simulated');
        }
    }

    /**
     * Sync a lead to HubSpot as a contact
     */
    async syncLeadToHubSpot(leadId: string): Promise<SyncResult> {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            return { success: false, action: 'skipped', message: 'Lead not found' };
        }

        const contact: HubSpotContact = {
            email: lead.email,
            firstname: lead.firstName,
            lastname: lead.lastName,
            company: lead.companyName,
            jobtitle: lead.jobTitle || undefined,
            phone: lead.phone || undefined,
            industry: lead.industry || undefined,
            hs_lead_status: this.mapStageToHubSpotStatus(lead.stage),
        };

        if (!this.isConfigured) {
            return this.simulateContactSync(lead, contact);
        }

        // Real HubSpot API call would go here
        return this.simulateContactSync(lead, contact);
    }

    /**
     * Simulate HubSpot contact sync for development
     */
    private async simulateContactSync(lead: any, contact: HubSpotContact): Promise<SyncResult> {
        const fakeHubSpotId = `hs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        this.logger.log(`[SIMULATED] Contact synced to HubSpot: ${contact.email}`);
        this.logger.log(`[SIMULATED] HubSpot Contact ID: ${fakeHubSpotId}`);

        // Store HubSpot ID in lead metadata
        const currentMetadata = (lead.metadata as Record<string, any>) || {};
        await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                metadata: {
                    ...currentMetadata,
                    hubspotContactId: fakeHubSpotId,
                    hubspotSyncedAt: new Date().toISOString(),
                },
            },
        });

        // Log activity (using LEAD_ENRICHED as closest match for CRM sync)
        await this.prisma.activity.create({
            data: {
                type: 'LEAD_ENRICHED',
                leadId: lead.id,
                metadata: {
                    action: 'hubspot_contact_synced',
                    hubspotId: fakeHubSpotId,
                    email: contact.email,
                },
            },
        });

        return {
            success: true,
            hubspotId: fakeHubSpotId,
            action: 'created',
        };
    }

    /**
     * Sync lead stage change to HubSpot deal pipeline
     */
    async syncDealStage(leadId: string, stage: string): Promise<SyncResult> {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            return { success: false, action: 'skipped', message: 'Lead not found' };
        }

        const metadata = (lead.metadata as Record<string, any>) || {};
        const hubspotDealId = metadata.hubspotDealId;

        const dealStage = this.mapStageToHubSpotDealStage(stage);

        if (!this.isConfigured) {
            return this.simulateDealSync(lead, dealStage, hubspotDealId);
        }

        return this.simulateDealSync(lead, dealStage, hubspotDealId);
    }

    /**
     * Simulate HubSpot deal sync
     */
    private async simulateDealSync(lead: any, dealStage: string, existingDealId?: string): Promise<SyncResult> {
        const hubspotDealId = existingDealId || `hs_deal_${Date.now()}`;
        const action = existingDealId ? 'updated' : 'created';

        this.logger.log(`[SIMULATED] Deal ${action} in HubSpot: ${hubspotDealId}`);
        this.logger.log(`[SIMULATED] Deal stage: ${dealStage}`);

        // Store HubSpot deal ID in lead metadata
        const currentMetadata = (lead.metadata as Record<string, any>) || {};
        await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                metadata: {
                    ...currentMetadata,
                    hubspotDealId,
                    hubspotDealStage: dealStage,
                    hubspotDealSyncedAt: new Date().toISOString(),
                },
            },
        });

        return {
            success: true,
            hubspotId: hubspotDealId,
            action,
        };
    }

    /**
     * Handle HubSpot webhook (contact updated)
     */
    async handleWebhook(payload: any): Promise<void> {
        const events = payload.subscriptionType ? [payload] : payload;

        for (const event of events) {
            const objectId = event.objectId?.toString();
            const propertyName = event.propertyName;
            const propertyValue = event.propertyValue;

            this.logger.log(`HubSpot webhook: ${event.subscriptionType} for object ${objectId}`);

            // Find lead by HubSpot ID
            const leads = await this.prisma.lead.findMany({
                where: {
                    metadata: {
                        path: ['hubspotContactId'],
                        equals: objectId,
                    },
                },
            });

            if (leads.length === 0) {
                this.logger.log(`No lead found for HubSpot contact ${objectId}`);
                continue;
            }

            const lead = leads[0];

            // Map HubSpot property changes to lead updates
            if (propertyName && propertyValue) {
                const updateData: Record<string, any> = {};

                switch (propertyName) {
                    case 'phone':
                        updateData.phone = propertyValue;
                        break;
                    case 'jobtitle':
                        updateData.jobTitle = propertyValue;
                        break;
                    case 'industry':
                        updateData.industry = propertyValue;
                        break;
                    // Add more mappings as needed
                }

                if (Object.keys(updateData).length > 0) {
                    await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: updateData,
                    });

                    this.logger.log(`Updated lead ${lead.id} from HubSpot: ${propertyName} = ${propertyValue}`);
                }
            }
        }
    }

    /**
     * Log activity to HubSpot timeline
     */
    async logActivity(leadId: string, activityType: string, details: Record<string, any>): Promise<void> {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) return;

        const metadata = (lead.metadata as Record<string, any>) || {};
        const hubspotContactId = metadata.hubspotContactId;

        if (!hubspotContactId) {
            this.logger.log(`Lead ${leadId} not synced to HubSpot, skipping activity log`);
            return;
        }

        this.logger.log(`[SIMULATED] Activity logged to HubSpot: ${activityType}`);
        this.logger.log(`[SIMULATED] Contact: ${hubspotContactId}, Details: ${JSON.stringify(details)}`);

        // In production, would call HubSpot Engagements API
    }

    /**
     * Bulk sync all leads to HubSpot
     */
    async bulkSync(): Promise<{ synced: number; failed: number }> {
        // Get leads that haven't been synced to HubSpot
        const allLeads = await this.prisma.lead.findMany({
            take: 100,
        });

        // Filter leads that don't have hubspotContactId in metadata
        const leads = allLeads.filter(lead => {
            const metadata = lead.metadata as Record<string, any> | null;
            return !metadata || !metadata.hubspotContactId;
        });

        let synced = 0;
        let failed = 0;

        for (const lead of leads) {
            try {
                const result = await this.syncLeadToHubSpot(lead.id);
                if (result.success) {
                    synced++;
                } else {
                    failed++;
                }
            } catch (error) {
                failed++;
                this.logger.error(`Failed to sync lead ${lead.id}:`, error);
            }
        }

        this.logger.log(`Bulk sync complete: ${synced} synced, ${failed} failed`);
        return { synced, failed };
    }

    // Helper methods
    private mapStageToHubSpotStatus(stage: string): string {
        const stageMap: Record<string, string> = {
            'NEW': 'NEW',
            'QUALIFYING': 'OPEN',
            'WARM_NURTURING': 'IN_PROGRESS',
            'HOT_ENGAGED': 'IN_PROGRESS',
            'MEETING_SCHEDULED': 'IN_PROGRESS',
            'PROPOSAL_SENT': 'OPEN_DEAL',
            'NEGOTIATION': 'OPEN_DEAL',
            'CLOSED_WON': 'CUSTOMER',
            'CLOSED_LOST': 'UNQUALIFIED',
        };
        return stageMap[stage] || 'OPEN';
    }

    private mapStageToHubSpotDealStage(stage: string): string {
        const stageMap: Record<string, string> = {
            'NEW': 'appointmentscheduled',
            'QUALIFYING': 'qualifiedtobuy',
            'WARM_NURTURING': 'qualifiedtobuy',
            'HOT_ENGAGED': 'presentationscheduled',
            'MEETING_SCHEDULED': 'presentationscheduled',
            'PROPOSAL_SENT': 'decisionmakerboughtin',
            'NEGOTIATION': 'contractsent',
            'CLOSED_WON': 'closedwon',
            'CLOSED_LOST': 'closedlost',
        };
        return stageMap[stage] || 'appointmentscheduled';
    }
}
