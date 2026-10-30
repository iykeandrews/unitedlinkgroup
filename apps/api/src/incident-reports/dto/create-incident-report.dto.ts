import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class IncidentPersonInputDto {
  @IsString()
  role!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  contactInfo?: string;
}

export class CreateIncidentReportDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9-]{16,80}$/)
  @IsOptional()
  submissionId?: string;

  @IsBoolean()
  @IsOptional()
  deferEmail?: boolean;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  type?: string; // GENERAL, THEFT, INJURY, SECURITY, DAMAGE

  @IsString()
  @IsOptional()
  severity?: string; // LOW, MEDIUM, HIGH, CRITICAL

  @IsString()
  @IsOptional()
  status?: string; // OPEN, INVESTIGATING, RESOLVED, CLOSED

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  buildingArea?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsDateString()
  @IsOptional()
  incidentAt?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  responseAction?: string;

  @IsBoolean()
  @IsOptional()
  witnessPresent?: boolean;

  @IsBoolean()
  @IsOptional()
  lawEnforcementInvolved?: boolean;

  @IsArray()
  @IsOptional()
  evidenceCollected?: string[];

  @IsString()
  @IsOptional()
  reportingOfficerEmployeeId?: string;

  @IsString()
  @IsOptional()
  assignedSupervisorId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IncidentPersonInputDto)
  persons?: IncidentPersonInputDto[];

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @IsNumber()
  @IsOptional()
  geoLat?: number;

  @IsNumber()
  @IsOptional()
  geoLng?: number;
}
