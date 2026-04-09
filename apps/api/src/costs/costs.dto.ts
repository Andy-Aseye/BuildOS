import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

enum CostCategory {
  MATERIALS = 'MATERIALS',
  LABOUR = 'LABOUR',
  EQUIPMENT = 'EQUIPMENT',
  SUBCONTRACTORS = 'SUBCONTRACTORS',
  TRANSPORT = 'TRANSPORT',
  MISCELLANEOUS = 'MISCELLANEOUS',
}
enum Currency {
  GHS = 'GHS',
  USD = 'USD',
}
enum CostStatus {
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export class CreateCostDto {
  @IsString() description: string;
  @IsEnum(CostCategory) category: CostCategory;
  @IsEnum(Currency) currency: Currency;
  @Type(() => Number)
  @IsNumber()
  amount: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fxRateAtEntry?: number;
  @IsOptional()
  @IsDateString()
  entryDate?: string;
}

export class UpdateCostStatusDto {
  @IsEnum(CostStatus) status: CostStatus;
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
