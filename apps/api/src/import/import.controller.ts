import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ImportService } from './import.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/import')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('OWNER', 'PROJECT_MANAGER')
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post('costs')
  importCosts(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body('rows') rows: any[],
  ) {
    return this.imports.importCosts(projectId, tenantId, user.id, rows);
  }

  @Post('attendance')
  importAttendance(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body('rows') rows: any[],
  ) {
    return this.imports.importAttendance(projectId, tenantId, user.id, rows);
  }

  @Post('materials')
  importMaterials(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body('rows') rows: any[],
    @Body('currency') currency?: string,
  ) {
    return this.imports.importMaterials(projectId, tenantId, user.id, rows, currency as any);
  }
}
