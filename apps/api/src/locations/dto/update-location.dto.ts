import { IsArray, ArrayMaxSize, MaxLength, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, ValidateNested, IsDateString } from 'class-validator';
import { TaxOverrideDto } from './tax-override.dto';

export class UpdateLocationDto {
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

