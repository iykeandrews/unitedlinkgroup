import { IsIn, IsNotEmpty, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class UpsertCompanyCertificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @IsIn(['CERTIFICATION', 'LICENSE', 'EDUCATION', 'TRAINING', 'OTHER'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  issuingOrganization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  credentialId?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'EXPIRED'])
  status?: string;
}

