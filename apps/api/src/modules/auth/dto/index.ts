import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecureP@ss123!', minLength: 12 })
    @IsString()
    @MinLength(12, { message: 'Password must be at least 12 characters' })
    @MaxLength(128)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must contain uppercase, lowercase, number, and special character',
    })
    password: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    lastName: string;
}

export class LoginDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecureP@ss123!' })
    @IsString()
    password: string;
}

export class RefreshTokenDto {
    @ApiProperty({ example: 'uuid-refresh-token' })
    @IsString()
    refreshToken: string;
}

export class TokenResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken: string;

    @ApiProperty({ example: 'uuid-refresh-token' })
    refreshToken: string;

    @ApiProperty({ example: 'Bearer' })
    tokenType: string;

    @ApiProperty({ example: 900, description: 'Token expiration in seconds' })
    expiresIn: number;
}
