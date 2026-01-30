import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProposalService } from './proposal.service';

/**
 * Public controller for client-facing proposal views.
 * No authentication required.
 */
@ApiTags('Public Proposals')
@Controller('public/proposals')
export class PublicProposalController {
    constructor(private readonly proposalService: ProposalService) { }

    @Get(':id')
    @ApiOperation({ summary: 'View a proposal (public link for clients)' })
    async viewProposal(@Param('id') id: string) {
        // Mark as viewed when client opens the link
        await this.proposalService.markViewed(id);
        return this.proposalService.findOne(id);
    }

    @Post(':id/accept')
    @ApiOperation({ summary: 'Client accepts the proposal' })
    async acceptProposal(@Param('id') id: string) {
        return this.proposalService.accept(id);
    }

    @Post(':id/decline')
    @ApiOperation({ summary: 'Client declines the proposal' })
    async declineProposal(
        @Param('id') id: string,
        @Body() body: { reason?: string },
    ) {
        // Optionally store the decline reason
        return this.proposalService.decline(id);
    }
}
