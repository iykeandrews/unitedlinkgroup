import { IsArray, ArrayMaxSize, MaxLength, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { TaxOverrideDto } from './tax-override.dto';
import { BillingServiceDto } from './billing-service.dto';

export class CreateLocationDto {
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
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  workOrder?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: string;

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
