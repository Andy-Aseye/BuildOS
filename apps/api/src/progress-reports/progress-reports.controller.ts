import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProgressReportsService } from './progress-reports.service';
import { UpdateProgressReportDto } from './progress-reports.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const FILE_LIMIT = 40 * 1024 * 1024;

type UserPayload = { id: string };

@Controller('projects/:projectId/progress-reports')
@UseGuards(AuthGuard, TenantGuard)
export class ProgressReportsController {
  constructor(private readonly reports: ProgressReportsService) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.reports.findAllForProject(projectId, tenantId);
  }

  @Get(':reportId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.reports.findOneForProject(reportId, projectId, tenantId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FILE_LIMIT },
    }),
  )
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string,
    @Body('narrativeSummary') narrativeSummary: string,
  ) {
    return this.reports.createFromUpload({
      projectId,
      tenantId,
      userId: user.id,
      file,
      periodStart,
      periodEnd,
      narrativeSummary,
    });
  }

  @Post('generate-narrative')
  generateNarrative(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string,
  ) {
    return this.reports.generateNarrative(projectId, tenantId, periodStart, periodEnd);
  }

  @Patch(':reportId')
  update(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: UpdateProgressReportDto,
  ) {
    return this.reports.update(reportId, projectId, tenantId, data);
  }

  @Delete(':reportId')
  remove(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.reports.remove(reportId, projectId, tenantId);
  }
}
