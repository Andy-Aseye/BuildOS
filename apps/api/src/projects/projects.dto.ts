import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsUUID, MinLength, MaxLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  clientName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetGhs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fxRateGhsUsd?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetGhs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fxRateGhsUsd?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string;
}

export class AddMemberDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ValidateIf((o) => !o.userId)
  @IsString()
  phone?: string;

  @IsEnum(['OWNER', 'PROJECT_MANAGER', 'ARCHITECT', 'FOREMAN', 'FIELD_WORKER'] as const)
  role: string;

  @IsOptional()
  @IsString()
  name?: string;
}
