import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@Controller('search')
@UseGuards(AuthGuard, TenantGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(@CurrentTenant() tenantId: string, @Query('q') q: string) {
    return this.search.search(tenantId, q ?? '');
  }
}
