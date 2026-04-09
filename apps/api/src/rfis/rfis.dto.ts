import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RFIStatus } from '@prisma/client';

export class CreateRfiDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  description: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  linkedDrawingId?: string;
}

export class UpdateRfiDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(RFIStatus)
  status?: RFIStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  response?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  clearAssigned?: boolean;
}

export class ListTenantRfisQueryDto {
  @IsOptional()
  @IsEnum(RFIStatus)
  status?: RFIStatus;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  overdueOnly?: boolean;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Non-closed RFIs (any status except CLOSED) */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  openOnly?: boolean;
}
