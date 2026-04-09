import { IsOptional, IsString, IsDateString, IsArray } from 'class-validator';
import { CursorPaginationDto } from '../common/pagination';

export class DiaryQueryDto extends CursorPaginationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateDiaryDto {
  @IsString()
  rawContent: string;

  @IsDateString()
  logDate: string;

  @IsOptional()
  @IsString()
  aiSummary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incidents?: string[];

  @IsOptional()
  @IsString()
  weather?: string;
}
