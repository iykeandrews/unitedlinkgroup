import { Type } from 'class-transformer';
import { IsArray, IsDate, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class EmailAttachmentDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  contentBase64!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;
}

export class CreateEmailCampaignDto {
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @IsString()
  @IsIn(['ALL', 'DEPARTMENT', 'ROLE', 'SPECIFIC'])
  targetType!: 'ALL' | 'DEPARTMENT' | 'ROLE' | 'SPECIFIC';

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'SCHEDULED', 'SENT'])
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT';
}
