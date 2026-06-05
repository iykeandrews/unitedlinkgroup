import { IsArray, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateGroupThreadDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/.+|\/uploads\/.+)$/, { message: 'imageUrl must be an absolute URL or /uploads/... path' })
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberEmployeeIds?: string[];
}
