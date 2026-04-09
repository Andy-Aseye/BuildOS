import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DelaysService } from './delays.service';
import { CreateDelayLogDto, UpdateDelayLogDto } from './delays.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type UserPayload = { id: string };

@Controller('projects/:projectId/delays')
@UseGuards(AuthGuard, TenantGuard)
export class DelaysController {
  constructor(private readonly delays: DelaysService) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.delays.findAllForProject(projectId, tenantId);
  }

  @Get(':delayId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('delayId') delayId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.delays.findOneForProject(delayId, projectId, tenantId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: CreateDelayLogDto,
  ) {
    return this.delays.create(projectId, tenantId, user.id, data);
  }

  @Patch(':delayId')
  update(
    @Param('projectId') projectId: string,
    @Param('delayId') delayId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: UpdateDelayLogDto,
  ) {
    return this.delays.update(delayId, projectId, tenantId, data);
  }

  @Delete(':delayId')
  remove(
    @Param('projectId') projectId: string,
    @Param('delayId') delayId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.delays.remove(delayId, projectId, tenantId);
  }
}
