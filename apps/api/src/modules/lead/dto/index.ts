import {
    IsEmail,
    IsString,
    IsOptional,
    IsArray,
    IsEnum,
    IsInt,
    IsBoolean,
    Min,
    Max,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { LeadStage, LeadStatus } from '@prisma/client';

// ========== Create Lead DTO ==========
export class CreateLeadDto {
    @ApiProperty({ example: 'john.doe@acmecorp.com' })
    @IsEmail()
    email: string;

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

    @ApiProperty({ example: 'ACME Corporation' })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    companyName: string;

    @ApiPropertyOptional({ example: 'acmecorp.com' })
    @IsOptional()
    @IsString()
    companyDomain?: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'VP of Operations' })
    @IsOptional()
    @IsString()
    jobTitle?: string;

    @ApiPropertyOptional({ example: 'Healthcare' })
    @IsOptional()
    @IsString()
    industry?: string;

    @ApiPropertyOptional({ example: 'US' })
    @IsOptional()
    @IsString()
    @MaxLength(2)
    country?: string;

    @ApiPropertyOptional({ example: 'California' })
    @IsOptional()
    @IsString()
    region?: string;

    @ApiPropertyOptional({ example: 'San Francisco' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ example: 'Interested in AiReview for claims processing' })
    @IsOptional()
    @IsString()
    originalMessage?: string;

    @ApiPropertyOptional({ example: ['AiReview', 'AiAxon'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    productsOfInterest?: string[];

    // Attribution
    @ApiPropertyOptional({ example: 'Website Contact Form' })
    @IsOptional()
    @IsString()
    sourceDetail?: string;

    @ApiPropertyOptional({ example: 'google' })
    @IsOptional()
    @IsString()
    utmSource?: string;

    @ApiPropertyOptional({ example: 'cpc' })
    @IsOptional()
    @IsString()
    utmMedium?: string;

    @ApiPropertyOptional({ example: 'healthcare_ai_2024' })
    @IsOptional()
    @IsString()
    utmCampaign?: string;

    @ApiPropertyOptional({ example: 'https://tachyhealth.com/solutions' })
    @IsOptional()
    @IsString()
    landingPage?: string;

    @ApiPropertyOptional({ example: 'WEBSITE_FORM', enum: ['WEBSITE_FORM', 'LINKEDIN', 'REFERRAL', 'COLD_EMAIL', 'CONFERENCE', 'PARTNER', 'INBOUND_CALL', 'OTHER'] })
    @IsOptional()
    @IsString()
    source?: string;
}

// ========== Update Lead DTO ==========
export class UpdateLeadDto extends PartialType(CreateLeadDto) { }

// ========== Update Stage DTO ==========
export class UpdateLeadStageDto {
    @ApiProperty({ enum: LeadStage, example: 'HOT_ENGAGED' })
    @IsEnum(LeadStage)
    stage: LeadStage;

    @ApiPropertyOptional({ example: 'Lead responded positively to demo offer' })
    @IsOptional()
    @IsString()
    reason?: string;
}

// ========== Assign Lead DTO ==========
export class AssignLeadDto {
    @ApiProperty({ example: 'uuid-of-sales-rep' })
    @IsString()
    assignedToId: string;
}

// ========== Add Note DTO ==========
export class AddNoteDto {
    @ApiProperty({ example: 'Had a great call with the client today...' })
    @IsString()
    @MinLength(1)
    content: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;
}

// ========== Query DTO ==========
export class LeadQueryDto {
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 25 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(200)
    limit?: number = 25;

    @ApiPropertyOptional({ example: 'acme' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: LeadStage })
    @IsOptional()
    @IsEnum(LeadStage)
    stage?: LeadStage;

    @ApiPropertyOptional({ enum: LeadStatus })
    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(100)
    scoreMin?: number;

    @ApiPropertyOptional({ example: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(100)
    scoreMax?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    assignedToId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    source?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    industry?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ example: '2024-01-01' })
    @IsOptional()
    @IsString()
    createdFrom?: string;

    @ApiPropertyOptional({ example: '2024-12-31' })
    @IsOptional()
    @IsString()
    createdTo?: string;

    @ApiPropertyOptional({ example: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}
