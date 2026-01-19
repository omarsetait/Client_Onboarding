import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
    @Get()
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({ status: 200, description: 'Service is healthy' })
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'tachyhealth-api',
            version: '1.0.0',
        };
    }

    @Get('ready')
    @ApiOperation({ summary: 'Readiness check endpoint' })
    @ApiResponse({ status: 200, description: 'Service is ready' })
    ready() {
        return {
            status: 'ready',
            timestamp: new Date().toISOString(),
        };
    }
}
