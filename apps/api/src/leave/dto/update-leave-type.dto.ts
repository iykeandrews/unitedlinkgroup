import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateLeaveTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsBoolean()
  @IsOptional()
  allowNegativeBalance?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  accrualFrequency?: string;

  @IsNumber()
  @IsOptional()
  accrualRate?: number;

  @IsNumber()
  @IsOptional()
  maxBalance?: number;

  @IsNumber()
  @IsOptional()
  carryOverLimit?: number;
}
