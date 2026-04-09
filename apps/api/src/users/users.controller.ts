import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './users.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard, TenantGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.users.findAllForTenant(tenantId);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() caller: { role: string },
    @Param('id') userId: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.users.update(tenantId, userId, caller.role, body);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() caller: { role: string },
    @Param('id') userId: string,
  ) {
    return this.users.softDelete(tenantId, userId, caller.role);
  }
}
