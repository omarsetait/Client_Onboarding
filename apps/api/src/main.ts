import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Security
    app.use(helmet({
        crossOriginResourcePolicy: false,
    }));

    // CORS - allow configured origins
    const allowedOrigins = [
        process.env.WEB_URL,
        'http://localhost:3000',
        'http://localhost:5173',
    ].filter((origin): origin is string => Boolean(origin));

    app.enableCors({
        origin: allowedOrigins,
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

    // Static Assets - use /tmp for serverless, local path otherwise
    const isServerless = process.env.VERCEL === '1' || process.env.RAILWAY_ENVIRONMENT;
    const uploadPath = isServerless ? '/tmp/uploads' : join(__dirname, '..', 'uploads');

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

    // Railway provides PORT env var, fallback to 3001 for local dev
    const port = process.env.PORT || process.env.API_PORT || 3001;

    // Bind to 0.0.0.0 for container deployments (Railway, Docker)
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 TachyHealth API running on port ${port}`);
    logger.log(`📚 Swagger docs available at /api/docs`);
}

bootstrap();
