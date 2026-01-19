import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { TeamsService } from './teams.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
    imports: [
        PrismaModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [NotificationsGateway, NotificationsService, TeamsService],
    exports: [NotificationsService, TeamsService],
})
export class NotificationsModule { }
