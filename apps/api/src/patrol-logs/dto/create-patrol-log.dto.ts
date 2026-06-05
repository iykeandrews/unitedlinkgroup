import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreatePatrolLogDto {
  @IsString()
  @IsNotEmpty()
  servicePinId!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  geoLat?: number;

  @IsNumber()
  @IsOptional()
  geoLng?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
