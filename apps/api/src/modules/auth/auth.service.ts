import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto, TokenResponseDto, RefreshTokenDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async register(dto: RegisterDto): Promise<TokenResponseDto> {
        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, 12);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: 'SALES_REP',
            },
        });

        return this.generateTokens(user.id, user.email, user.role);
    }

    async login(dto: LoginDto): Promise<TokenResponseDto> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return this.generateTokens(user.id, user.email, user.role);
    }

    async refreshToken(dto: RefreshTokenDto): Promise<TokenResponseDto> {
        const session = await this.prisma.session.findUnique({
            where: { refreshToken: dto.refreshToken },
            include: { user: true },
        });

        if (!session) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (session.expiresAt < new Date()) {
            await this.prisma.session.deleteMany({ where: { id: session.id } });
            throw new UnauthorizedException('Refresh token expired');
        }

        // Rotate refresh token
        await this.prisma.session.deleteMany({ where: { id: session.id } });

        return this.generateTokens(session.user.id, session.user.email, session.user.role);
    }

    async logout(userId: string, refreshToken: string): Promise<void> {
        await this.prisma.session.deleteMany({
            where: {
                userId,
                refreshToken,
            },
        });
    }

    async logoutAll(userId: string): Promise<void> {
        await this.prisma.session.deleteMany({
            where: { userId },
        });
    }

    private async generateTokens(
        userId: string,
        email: string,
        role: string,
    ): Promise<TokenResponseDto> {
        const payload = { sub: userId, email, role };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = uuidv4();

        const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn, 10) || 7);

        // Store refresh token
        await this.prisma.session.create({
            data: {
                userId,
                refreshToken,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: 900, // 15 minutes in seconds
        };
    }

    async validateUser(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
            },
        });
    }
}
