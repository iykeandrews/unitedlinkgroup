import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateShiftSwapDto {
  @IsUUID()
  offeredShiftId!: string;

  @IsUUID()
  requestedShiftId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsUUID()
  requesterEmployeeId?: string;
}

