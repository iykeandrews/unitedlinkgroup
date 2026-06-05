import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateThreadDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/.+|\/uploads\/.+)$/, { message: 'imageUrl must be an absolute URL or /uploads/... path' })
  imageUrl?: string;
}
