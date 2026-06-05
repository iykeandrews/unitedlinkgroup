import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitEmployeeFormAssignmentDto {
  @IsString()
  @IsOptional()
  values?: string;

  @IsString()
  @IsNotEmpty()
  signatureData!: string;

  @IsString()
  @IsNotEmpty()
  signatureName!: string;
}
