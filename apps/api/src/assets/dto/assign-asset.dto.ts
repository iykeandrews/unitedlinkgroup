import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class AssignAssetDto {
  @IsString()
  assignedToId!: string;

  @IsDateString()
  @IsOptional()
  assignedDate?: string;

  @IsDateString()
  @IsOptional()
  expectedReturnDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;
}
