import { IsString, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { DrawingStatus } from '@prisma/client';

export class CreateDrawingReviewDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;
}

export class UpdateDrawingReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsEnum(DrawingStatus)
  status?: DrawingStatus;

  @IsOptional()
  @IsUUID()
  reviewerId?: string | null;
}

export class AddRevisionBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comments?: string;
}
