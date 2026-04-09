import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RfisService } from './rfis.service';
import { ListTenantRfisQueryDto } from './rfis.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@Controller('rfis')
@UseGuards(AuthGuard, TenantGuard)
export class TenantRfisController {
  constructor(private readonly rfis: RfisService) {}

  /** Cross-project RFI list for Open Items dashboard */
  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListTenantRfisQueryDto) {
    return this.rfis.findAllForTenant(tenantId, query);
  }
}
