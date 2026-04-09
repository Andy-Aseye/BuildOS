import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryQueryDto, CreateDiaryDto } from './diary.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/diary')
@UseGuards(AuthGuard, TenantGuard)
export class DiaryController {
  constructor(private readonly diary: DiaryService) {}

  @Get('photos')
  photos(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.diary.getPhotos(projectId, tenantId, from, to);
  }

  @Get()
  list(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @Query() query: DiaryQueryDto,
  ) {
    return this.diary.findAll(projectId, tenantId, query);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() data: CreateDiaryDto,
  ) {
    return this.diary.create(projectId, tenantId, user.id, data);
  }
}
