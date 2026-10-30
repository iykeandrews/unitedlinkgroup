import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
export class ConductListDto {
  @IsOptional() @IsIn(["COMPLAINT", "QUERY"]) kind?: string;
  @IsOptional()
  @IsIn([
    "",
    "DRAFT",
    "OPEN",
    "AWAITING_RESPONSE",
    "UNDER_REVIEW",
    "RESOLVED",
    "CLOSED",
  ])
  status?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsIn(["true", "false"]) mine?: string;
  @IsOptional() @IsIn(["true", "false"]) overdue?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}
export class CreateConductDto {
  @IsIn(["COMPLAINT", "QUERY"]) kind!: string;
  @IsIn(["EMPLOYEE", "OPERATIONS", "ACTIVITIES"]) subject!: string;
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsString() @MinLength(10) @MaxLength(20000) description!: string;
  @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH", "URGENT"]) priority?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() @MaxLength(200) customerName?: string;
  @IsOptional() @IsString() @MaxLength(500) customerContact?: string;
  @IsOptional() @IsString() ownerEmployeeId?: string;
  @IsOptional() @IsString() sourceCaseId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}
export class ConductActionDto {
  @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH", "URGENT"]) priority?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) category?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsInt() @Min(0) version!: number;
  @IsIn([
    "EDIT",
    "ISSUE",
    "ASSIGN",
    "REVIEW",
    "NOTE",
    "CUSTOMER_UPDATE",
    "ACKNOWLEDGE",
    "RESPOND",
    "RESOLVE",
    "CLOSE",
    "REOPEN",
    "FOLLOW_UP_COMPLETE",
  ])
  action!: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  description?: string;
  @IsOptional() @IsString() @MaxLength(20000) message?: string;
  @IsOptional() @IsIn(["INTERNAL", "EMPLOYEE"]) visibility?: string;
  @IsOptional() @IsString() ownerEmployeeId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsDateString() followUpAt?: string;
  @IsOptional()
  @IsIn([
    "SUBSTANTIATED",
    "NOT_SUBSTANTIATED",
    "PARTIALLY_SUBSTANTIATED",
    "RESOLVED_BY_SERVICE_RECOVERY",
    "NO_MISCONDUCT",
    "COACHING",
    "WRITTEN_WARNING",
    "FURTHER_ACTION",
  ])
  outcome?: string;
  @IsOptional() @IsString() @MaxLength(10000) resolution?: string;
  @IsOptional() @IsString() @MaxLength(10000) rootCause?: string;
  @IsOptional() @IsString() @MaxLength(10000) correctiveAction?: string;
  @IsOptional() @IsString() @MaxLength(10000) preventiveAction?: string;
}
