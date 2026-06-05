import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResumeLeaveRequestDto {
  @IsDateString()
  @IsNotEmpty()
  resumedAt!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  resumedReason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  resumedTime?: string;
}

