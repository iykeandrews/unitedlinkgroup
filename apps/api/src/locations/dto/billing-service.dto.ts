import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
export class BillingServiceDto {
  @IsIn([
    "ARMED_SPO",
    "UNARMED_SPO",
    "SECURITY_OFFICER",
    "SECURITY_GUARD",
    "ARMED_SECURITY_GUARD",
    "PRIVATE_DETECTIVE",
    "OTHER",
  ])
  type!: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  rate!: number;
}
