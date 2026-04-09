import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './invites.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  @UseGuards(AuthGuard, TenantGuard)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() caller: { id: string; role: string },
    @Body() body: CreateInviteDto,
  ) {
    return this.invites.create(tenantId, caller.id, caller.role, body);
  }

  @Get()
  @UseGuards(AuthGuard, TenantGuard)
  list(@CurrentTenant() tenantId: string) {
    return this.invites.list(tenantId);
  }

  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.invites.validateToken(token);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, TenantGuard)
  revoke(
    @CurrentTenant() tenantId: string,
    @CurrentUser() caller: { role: string },
    @Param('id') inviteId: string,
  ) {
    return this.invites.revoke(tenantId, inviteId, caller.role);
  }
}
