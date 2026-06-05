import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeFormTemplateDto {
  @IsString()
  @IsOptional()
  businessId?: string;

  @IsEnum(['EMPLOYMENT_FORM', 'SOP'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

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

