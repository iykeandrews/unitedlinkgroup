import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';

export class CreateServicePinDto {
  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @IsString()
  @IsNotEmpty()
  positionType!: string;

  @IsNumber()
  @IsOptional()
  count?: number;

  @IsString()
  @IsNotEmpty()
  shiftType!: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  days?: string;

  @IsNumber()
  @IsOptional()
  payRate?: number;

  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @IsNumber()
  @IsOptional()
  geoLat?: number;

  @IsNumber()
  @IsOptional()
  geoLng?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
