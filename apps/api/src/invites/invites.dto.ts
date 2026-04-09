import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';

const ROLES = ['OWNER', 'PROJECT_MANAGER', 'ARCHITECT', 'FOREMAN', 'FIELD_WORKER'] as const;

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(ROLES)
  role: string;
}
