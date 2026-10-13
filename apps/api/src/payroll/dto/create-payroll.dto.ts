import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsIn,
} from "class-validator";

export class CreatePayrollDto {
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  periodStart!: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  periodEnd!: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  payDate!: string;

  @IsIn(["WEEKLY", "BI_WEEKLY", "SEMI_MONTHLY", "MONTHLY"])
  paySchedule!: string;

  @IsIn(["REGULAR"])
  @IsOptional()
  type?: string;
}
