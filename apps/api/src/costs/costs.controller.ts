import { Controller, Delete, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { CostsService } from './costs.service';
import { CreateCostDto, UpdateCostStatusDto } from './costs.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/costs')
@UseGuards(AuthGuard, TenantGuard)
export class CostsController {
  constructor(private readonly costs: CostsService) {}

  @Get()
  list(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.costs.findAll(projectId, tenantId);
  }

  @Get('summary')
  summary(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.costs.budgetSummary(projectId, tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'PROJECT_MANAGER')
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() data: CreateCostDto,
  ) {
    return this.costs.create(projectId, tenantId, user.id, data);
  }

  @Patch(':costId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'PROJECT_MANAGER')
  updateStatus(
    @Param('projectId') projectId: string,
    @Param('costId') costId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() data: UpdateCostStatusDto,
  ) {
    return this.costs.updateStatus(projectId, tenantId, costId, user.id, data);
  }

  @Delete(':costId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'PROJECT_MANAGER')
  remove(
    @Param('projectId') projectId: string,
    @Param('costId') costId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.costs.softDelete(projectId, tenantId, costId);
  }
}
