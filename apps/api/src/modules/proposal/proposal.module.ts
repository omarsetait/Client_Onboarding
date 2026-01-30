import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationModule } from '../communication/communication.module';
import { LeadModule } from '../lead/lead.module';
import { ProposalService } from './proposal.service';
import { ProposalController } from './proposal.controller';
import { PublicProposalController } from './public-proposal.controller';

@Module({
    imports: [PrismaModule, CommunicationModule, LeadModule],
    providers: [ProposalService],
    controllers: [ProposalController, PublicProposalController],
    exports: [ProposalService],
})
export class ProposalModule { }
