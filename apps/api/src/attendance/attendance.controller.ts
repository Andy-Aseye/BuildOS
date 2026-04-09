import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, AttendanceQueryDto } from './attendance.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/attendance')
@UseGuards(AuthGuard, TenantGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('summary')
  summary(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.attendance.weeklySummary(projectId, tenantId);
  }

  @Get()
  list(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendance.findAll(projectId, tenantId, query);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() data: CreateAttendanceDto,
  ) {
    return this.attendance.create(projectId, tenantId, user.id, data);
  }
}
