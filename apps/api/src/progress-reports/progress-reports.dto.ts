import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProgressReportDto {
  @IsOptional()
  @IsEmail()
  sentToEmail?: string;
}
