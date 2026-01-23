import { IsString, IsEmail, IsOptional, IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublicLeadIntakeDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Smith' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({ example: 'john.smith@company.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: '+1-555-0123', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'Acme Healthcare' })
    @IsString()
    @IsNotEmpty()
    companyName: string;

    @ApiProperty({ example: 'Chief Technology Officer' })
    @IsString()
    @IsNotEmpty()
    jobTitle: string;

    @ApiProperty({
        example: ['AiReview', 'AiCode'],
        description: 'Products the lead is interested in: AiReview, AiPharma, AiCode, AiAudit, AiPolicy'
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    productsOfInterest: string[];

    @ApiProperty({
        example: 'We are interested in automating our claims processing workflow.',
        description: 'Message from the lead about their needs'
    })
    @IsString()
    @IsNotEmpty()
    message: string;
}
