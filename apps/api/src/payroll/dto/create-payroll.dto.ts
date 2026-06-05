import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreatePayrollDto {
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @IsDateString()
  @IsNotEmpty()
  periodEnd!: string;

  @IsDateString()
  @IsNotEmpty()
  payDate!: string;

  @IsString()
  @IsOptional()
  type?: string;
}
