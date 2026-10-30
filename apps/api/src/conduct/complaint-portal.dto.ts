import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
export class PublicComplaintDto {
  @IsUUID() submissionId!: string;
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsString() @MinLength(15) @MaxLength(12000) description!: string;
  @IsIn(["EMPLOYEE", "OPERATIONS", "ACTIVITIES"]) subject!: string;
  @IsOptional() @IsString() @MaxLength(200) employeeName?: string;
  @IsOptional() @IsString() @MaxLength(200) locationName?: string;
  @IsString() @MinLength(1) @MaxLength(2048) verificationToken!: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}
