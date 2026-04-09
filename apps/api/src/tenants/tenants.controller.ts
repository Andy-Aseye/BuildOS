import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './tenants.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@Controller('tenants')
@UseGuards(AuthGuard, TenantGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('current')
  getCurrent(@CurrentTenant() tenantId: string) {
    return this.tenants.findById(tenantId);
  }

  @Patch('current')
  update(@CurrentTenant() tenantId: string, @Body() data: UpdateTenantDto) {
    return this.tenants.update(tenantId, data);
  }
}
