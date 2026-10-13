import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from "class-validator";

export class CreateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsNumber()
  @Min(0.000001)
  @Max(1000000)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20000000)
  rate!: number;
}
