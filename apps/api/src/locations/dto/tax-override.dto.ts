import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TaxOverrideDto {
  @IsString()
  taxSystem!: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsBoolean()
  @IsOptional()
  inclusive?: boolean;

  @IsString()
  @IsOptional()
  note?: string;
}

