import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreatePaymentDto {
  @IsDateString()
  date!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  payeeName?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  dcWard?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
