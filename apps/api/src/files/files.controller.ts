import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { CreateFileBodyDto, FileQueryDto } from './files.dto';
import { StorageService } from '../storage/storage.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const FILE_LIMIT = 40 * 1024 * 1024;

@Controller('projects/:projectId/files')
@UseGuards(AuthGuard, TenantGuard)
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Query() query: FileQueryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.files.findAll(projectId, query, tenantId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() body: CreateFileBodyDto,
  ) {
    const { fileSize, ...data } = body;
    return this.files.create(projectId, tenantId, user.id, data, fileSize);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: FILE_LIMIT } }),
  )
  async upload(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
  ) {
    const storageUrl = await this.storage.uploadPublicObject({
      tenantId,
      projectId,
      folder: 'files',
      filename: file.originalname || 'file.bin',
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });
    return this.files.create(
      projectId,
      tenantId,
      user.id,
      {
        name: file.originalname || 'file',
        folder: (folder as any) || 'OTHER',
        storageUrl,
        mimeType: file.mimetype || 'application/octet-stream',
      },
      file.size,
    );
  }

  @Delete(':fileId')
  remove(
    @Param('fileId') fileId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.files.softDelete(fileId, tenantId);
  }

  @Get(':fileId/url')
  url(@Param('fileId') fileId: string, @CurrentTenant() tenantId: string) {
    return this.files.getSignedUrl(fileId, tenantId);
  }
}
