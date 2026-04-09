import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DrawingsService } from './drawings.service';
import {
  AddRevisionBodyDto,
  CreateDrawingReviewDto,
  UpdateDrawingReviewDto,
} from './drawings.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const FILE_LIMIT = 40 * 1024 * 1024;

type UserPayload = { id: string };

@Controller('projects/:projectId/drawing-reviews')
@UseGuards(AuthGuard, TenantGuard)
export class DrawingsController {
  constructor(private readonly drawings: DrawingsService) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.drawings.findAllForProject(projectId, tenantId);
  }

  @Get(':drawingId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.drawings.findOneForProject(drawingId, projectId, tenantId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: CreateDrawingReviewDto,
  ) {
    return this.drawings.create(projectId, tenantId, user.id, data);
  }

  @Patch(':drawingId')
  update(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: UpdateDrawingReviewDto,
  ) {
    return this.drawings.update(drawingId, projectId, tenantId, data);
  }

  @Post(':drawingId/revisions')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FILE_LIMIT },
    }),
  )
  addRevision(
    @Param('projectId') projectId: string,
    @Param('drawingId') drawingId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AddRevisionBodyDto,
  ) {
    return this.drawings.addRevision(
      drawingId,
      projectId,
      tenantId,
      user.id,
      file,
      body?.comments,
    );
  }
}
