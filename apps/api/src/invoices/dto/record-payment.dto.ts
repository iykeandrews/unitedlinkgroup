import {
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
} from "class-validator";
import { PAYMENT_METHODS } from "../invoice-accounting";
export class RecordPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(20000000) amount!: number;
  @IsDateString({ strict: true }) paidAt!: string;
  @IsIn(PAYMENT_METHODS) method!: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsUUID() idempotencyKey!: string;
}
export class VoidPaymentDto {
  @IsString() @MaxLength(2000) reason!: string;
}
