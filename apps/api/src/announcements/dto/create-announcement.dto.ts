import { IsString, IsEnum, IsOptional, IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(['NORMAL', 'HIGH', 'URGENT'])
  priority!: 'NORMAL' | 'HIGH' | 'URGENT';

  @IsEnum(['ALL', 'DEPARTMENT', 'ROLE'])
  targetType!: 'ALL' | 'DEPARTMENT' | 'ROLE';

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @IsEnum(['DRAFT', 'PUBLISHED'])
  status!: 'DRAFT' | 'PUBLISHED';
}
