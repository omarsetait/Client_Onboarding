import { Module } from '@nestjs/common';
import { DocuSignModule } from './docusign/docusign.module';
import { HubSpotModule } from './hubspot/hubspot.module';

@Module({
    imports: [DocuSignModule, HubSpotModule],
    exports: [DocuSignModule, HubSpotModule],
})
export class IntegrationsModule { }
