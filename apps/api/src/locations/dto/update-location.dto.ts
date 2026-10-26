import { IsArray, ArrayMaxSize, MaxLength, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, ValidateNested, IsDateString } from 'class-validator';
import { TaxOverrideDto } from './tax-override.dto';
import { BillingServiceDto } from './billing-service.dto';

export class UpdateLocationDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BillingServiceDto)
  billingServices?: BillingServiceDto[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  billingServicesVersion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  billingServicesNote?: string;
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  workOrder?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  geoLat?: number;

  @IsOptional()
  @IsNumber()
  geoLng?: number;

  @IsOptional()
  @IsNumber()
  radius?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaxOverrideDto)
  taxOverrideInfo?: TaxOverrideDto;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  billingPins?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  @MaxLength(254, { each: true })
  incidentReportEmails?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  @MaxLength(254, { each: true })
  incidentReportCcEmails?: string[];

}

