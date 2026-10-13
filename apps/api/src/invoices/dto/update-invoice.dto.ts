import { PartialType } from "@nestjs/mapped-types";
import { CreateInvoiceDto } from "./create-invoice.dto";
import { IsOptional, IsDateString } from "class-validator";
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @IsOptional() @IsDateString({ strict: true }) expectedUpdatedAt?: string;
}
