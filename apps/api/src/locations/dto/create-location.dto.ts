import { IsArray, ArrayMaxSize, MaxLength, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { TaxOverrideDto } from './tax-override.dto';

export class CreateLocationDto {
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
