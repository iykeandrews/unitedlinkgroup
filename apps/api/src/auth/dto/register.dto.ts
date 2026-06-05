import { UserRole } from '@unitedlinkgroup/types';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
