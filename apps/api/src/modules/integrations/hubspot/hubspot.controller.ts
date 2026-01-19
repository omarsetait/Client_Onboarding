import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HubSpotService } from './hubspot.service';

@Controller('integrations/hubspot')
export class HubSpotController {
    constructor(private readonly hubSpotService: HubSpotService) { }

    /**
     * Sync a single lead to HubSpot
     */
    @Post('sync/:leadId')
    @UseGuards(JwtAuthGuard)
    async syncLead(@Param('leadId') leadId: string) {
        const result = await this.hubSpotService.syncLeadToHubSpot(leadId);
        return result;
    }

    /**
     * Sync deal stage to HubSpot
     */
    @Post('sync-stage/:leadId')
    @UseGuards(JwtAuthGuard)
    async syncDealStage(
        @Param('leadId') leadId: string,
        @Body('stage') stage: string,
    ) {
        const result = await this.hubSpotService.syncDealStage(leadId, stage);
        return result;
    }

    /**
     * Bulk sync all unsynced leads
     */
    @Post('bulk-sync')
    @UseGuards(JwtAuthGuard)
    async bulkSync() {
        const result = await this.hubSpotService.bulkSync();
        return {
            success: true,
            ...result,
        };
    }

    /**
     * Log activity to HubSpot
     */
    @Post('activity/:leadId')
    @UseGuards(JwtAuthGuard)
    async logActivity(
        @Param('leadId') leadId: string,
        @Body() body: { type: string; details: Record<string, any> },
    ) {
        await this.hubSpotService.logActivity(leadId, body.type, body.details);
        return { success: true };
    }

    /**
     * HubSpot webhook endpoint (no auth - called by HubSpot)
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() payload: any) {
        await this.hubSpotService.handleWebhook(payload);
        return { received: true };
    }
}
