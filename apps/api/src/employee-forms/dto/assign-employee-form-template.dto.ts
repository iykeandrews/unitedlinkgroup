import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class AssignEmployeeFormTemplateDto {
  @IsArray()
  @IsOptional()
  employeeIds?: string[];

  @IsString()
  @IsOptional()
  assignAll?: string;

  @IsDateString()
  @IsOptional()
  dueAt?: string;
}

