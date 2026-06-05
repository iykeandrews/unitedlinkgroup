import { IsString, IsOptional, IsEnum, IsBoolean, IsEmail } from 'class-validator';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['CORPORATE', 'GOVERNMENT', 'INDIVIDUAL'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  alternateContact?: string;

  @IsBoolean()
  @IsOptional()
  billingAddressSameAsOffice?: boolean;

  @IsString()
  @IsOptional()
  billingAddress?: string;

  @IsEmail()
  @IsOptional()
  billingContactEmail?: string;

  @IsEmail()
  @IsOptional()
  billingContactEmail2?: string;

  @IsEmail()
  @IsOptional()
  billingContactEmail3?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;
}
