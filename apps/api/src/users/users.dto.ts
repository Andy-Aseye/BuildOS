import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';

const ROLES = ['OWNER', 'PROJECT_MANAGER', 'ARCHITECT', 'FOREMAN', 'FIELD_WORKER'] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ROLES)
  role?: string;

  @IsOptional()
  @IsString()
  whatsappPhone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
