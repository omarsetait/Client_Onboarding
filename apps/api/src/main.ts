import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    // DEBUG: Log available environment variables (keys only) to debug Vercel issues
    const envKeys = Object.keys(process.env).sort();
    logger.debug(`Environment Variables available: ${envKeys.join(', ')}`);

    // Check critical keys
    if (!process.env.JWT_SECRET) {
        logger.error('CRITICAL: JWT_SECRET is missing from process.env');
    } else {
        logger.log('JWT_SECRET is present (length: ' + process.env.JWT_SECRET.length + ')');
    }

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Security
    // app.use(helmet()); 
    // Helmet blocks cross-origin images by default. 
    // For local dev with static files, we might need to adjust or disable contentSecurityPolicy
    app.use(helmet({
        crossOriginResourcePolicy: false,
    }));
    app.enableCors({
        origin: process.env.WEB_URL || 'http://localhost:3000',
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Static Assets
    const isVercel = process.env.VERCEL === '1';
    const uploadPath = isVercel ? '/tmp/uploads' : join(__dirname, '..', 'uploads');

    // In Vercel, static serving from /tmp is limited, but we configure it to prevent crash
    app.useStaticAssets(uploadPath, {
        prefix: '/uploads/',
    });

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('TachyHealth Onboarding API')
        .setDescription('AI-Powered Autonomous Client Onboarding System API')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication endpoints')
        .addTag('leads', 'Lead management endpoints')
        .addTag('users', 'User management endpoints')
        .addTag('meetings', 'Meeting scheduling endpoints')
        .addTag('documents', 'Document generation endpoints')
        .addTag('analytics', 'Analytics and insights endpoints')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.API_PORT || 3001;
    await app.listen(port);

    console.log(`🚀 TachyHealth API running on: http://localhost:${port}`);
    console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
