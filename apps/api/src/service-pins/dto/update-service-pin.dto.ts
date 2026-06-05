import { PartialType } from '@nestjs/mapped-types';
import { CreateServicePinDto } from './create-service-pin.dto';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateServicePinDto {
    @IsOptional()
    @IsString()
    positionType?: string;
  
    @IsOptional()
    @IsNumber()
    count?: number;
  
    @IsOptional()
    @IsString()
    shiftType?: string;
  
    @IsOptional()
    @IsString()
    startTime?: string;
  
    @IsOptional()
    @IsString()
    endTime?: string;
  
    @IsOptional()
    @IsString()
    days?: string;
  
    @IsOptional()
    @IsNumber()
    payRate?: number;
  
    @IsOptional()
    @IsString()
    specialInstructions?: string;
  
    @IsOptional()
    @IsNumber()
    geoLat?: number;
  
    @IsOptional()
    @IsNumber()
    geoLng?: number;
  
    @IsOptional()
    @IsString()
    status?: string;
}
