import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateQualificationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  type?: string; // CERTIFICATION, LICENSE, EDUCATION, OTHER

  @IsOptional()
  @IsString()
  issuingOrganization?: string;

  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  status?: string; // ACTIVE, EXPIRED, REVOKED
}
