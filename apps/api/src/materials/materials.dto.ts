import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Currency,
  MaterialsRequestStatus,
} from '@prisma/client';

export class MaterialsLineDto {
  @IsString()
  @MaxLength(2000)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  @MaxLength(64)
  unit!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedUnitCost?: number;
}

export class CreateMaterialsRequestDto {
  @IsEnum(Currency)
  currency!: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  requiresOwnerApproval?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialsLineDto)
  items!: MaterialsLineDto[];
}

export class UpdateMaterialsRequestDto {
  @IsOptional()
  @IsEnum(MaterialsRequestStatus)
  status?: MaterialsRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  requiresOwnerApproval?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialsLineDto)
  items?: MaterialsLineDto[];

  @IsOptional()
  @IsString()
  costEntryId?: string;
}

export class RecordDeliveryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveredQuantity!: number;
}
