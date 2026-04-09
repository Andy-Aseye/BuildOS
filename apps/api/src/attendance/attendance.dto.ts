import { IsInt, Min, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttendanceDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  workerCount: number;
  @IsDateString()
  logDate: string;
}

export class AttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
