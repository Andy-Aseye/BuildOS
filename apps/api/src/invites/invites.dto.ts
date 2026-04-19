import { IsEmail, IsString, IsOptional, IsEnum, Matches, MaxLength } from 'class-validator';

const ROLES = ['OWNER', 'PROJECT_MANAGER', 'ARCHITECT', 'FOREMAN', 'FIELD_WORKER'] as const;

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Phone must be a valid number (e.g. +233241234567)' })
  phone?: string;

  @IsEnum(ROLES)
  role: string;
}
