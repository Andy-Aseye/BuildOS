import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum FileFolder {
  DRAWINGS = 'DRAWINGS',
  CONTRACTS = 'CONTRACTS',
  PERMITS = 'PERMITS',
  REPORTS = 'REPORTS',
  OTHER = 'OTHER',
}

export class CreateFileDto {
  @IsString() name: string;
  @IsEnum(FileFolder) folder: FileFolder;
  @IsString() storageUrl: string;
  @IsString() mimeType: string;
}

export class CreateFileBodyDto extends CreateFileDto {
  @Type(() => Number) @IsInt() @Min(0) fileSize: number;
}

export class FileQueryDto {
  @IsOptional() @IsEnum(FileFolder) folder?: FileFolder;
}
