import { Type } from "class-transformer";
import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
  MaxLength,
} from "class-validator";
import { CreateInvoiceItemDto } from "./create-invoice-item.dto";

export class CreateInvoiceDto {
  @IsString()
  @IsUUID()
  clientId!: string;

  @IsDateString({ strict: true })
  issueDate!: string;

  @IsDateString({ strict: true })
  dueDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];

  @IsOptional()
  @IsString()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  @IsIn(["DRAFT", "SENT", "VOID", "CANCELLED"])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}
