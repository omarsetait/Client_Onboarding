import { Module } from '@nestjs/common';
import { HubSpotController } from './hubspot.controller';
import { HubSpotService } from './hubspot.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [HubSpotController],
    providers: [HubSpotService],
    exports: [HubSpotService],
})
export class HubSpotModule { }
