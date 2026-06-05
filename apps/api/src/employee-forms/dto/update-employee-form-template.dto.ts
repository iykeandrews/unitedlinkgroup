import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeFormTemplateDto {
  @IsEnum(['EMPLOYMENT_FORM', 'SOP'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  fields?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsBoolean()
  @IsOptional()
  acknowledgementRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresSignature?: boolean;
}

