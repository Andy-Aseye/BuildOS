import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DelayCause } from '@prisma/client';

export class CreateDelayLogDto {
  @IsString()
  delayDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationHours!: number;

  @IsEnum(DelayCause)
  cause!: DelayCause;

  @IsString()
  @MaxLength(8000)
  description!: string;

  @IsOptional()
  @IsUUID()
  linkedRFIId?: string;
}

export class UpdateDelayLogDto {
  @IsOptional()
  @IsString()
  delayDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationHours?: number;

  @IsOptional()
  @IsEnum(DelayCause)
  cause?: DelayCause;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  reviewedByPM?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  causeOverrideNote?: string;

  @IsOptional()
  @IsUUID()
  linkedRFIId?: string | null;
}
