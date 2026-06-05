import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, MaxLength } from 'class-validator';

export class UpsertComplianceDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @IsIn(['POLICY', 'SOP', 'TRAINING', 'OSHA', 'HR', 'SECURITY', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsUUID()
  ownerEmployeeId?: string;

  @IsOptional()
  @IsBoolean()
  acknowledgementRequired?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tags?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;
}

