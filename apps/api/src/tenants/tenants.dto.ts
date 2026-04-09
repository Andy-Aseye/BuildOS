import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  /** Hex color e.g. #2563EB */
  @IsOptional()
  @IsString()
  primaryColor?: string;
}
