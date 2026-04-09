import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RfisService } from './rfis.service';
import { CreateRfiDto, UpdateRfiDto } from './rfis.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type UserPayload = { id: string };

@Controller('projects/:projectId/rfis')
@UseGuards(AuthGuard, TenantGuard)
export class ProjectRfisController {
  constructor(private readonly rfis: RfisService) {}

  @Get()
  list(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.rfis.findAllForProject(projectId, tenantId);
  }

  @Get(':rfiId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('rfiId') rfiId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rfis.findOneForProject(rfiId, projectId, tenantId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: CreateRfiDto,
  ) {
    return this.rfis.create(projectId, tenantId, user.id, data);
  }

  @Patch(':rfiId')
  update(
    @Param('projectId') projectId: string,
    @Param('rfiId') rfiId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: UpdateRfiDto,
  ) {
    return this.rfis.update(rfiId, projectId, tenantId, data);
  }
}
