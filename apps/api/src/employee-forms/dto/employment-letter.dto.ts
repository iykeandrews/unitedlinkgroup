import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";
import { employmentLetterTitles } from "../employment-letter";
import type { EmploymentLetterType } from "../employment-letter";

export class OpenEmploymentLetterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  employeeId!: string;
}

export class EmploymentLetterDto extends OpenEmploymentLetterDto {
  @IsIn(Object.keys(employmentLetterTitles))
  type!: EmploymentLetterType;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  employeeName?: string;

  @ValidateIf((letter) => letter.type === "APPOINTMENT")
  @IsString()
  @Matches(/^(?!0+(?:\.0{1,2})?$)\d{1,6}(?:\.\d{1,2})?$/, {
    message: "Enter a positive hourly rate with up to two decimal places",
  })
  hourlyRate?: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  position!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  letterDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  signatory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1600)
  notes?: string;
}

export class EmailEmploymentLetterDto extends EmploymentLetterDto {
  @IsEmail()
  @MaxLength(254)
  expectedEmail!: string;
}
