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
import { MaterialsService } from './materials.service';
import {
  CreateMaterialsRequestDto,
  RecordDeliveryDto,
  UpdateMaterialsRequestDto,
} from './materials.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type UserPayload = { id: string };

@Controller('projects/:projectId/materials-requests')
@UseGuards(AuthGuard, TenantGuard)
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.materials.findAllForProject(projectId, tenantId);
  }

  @Get(':requestId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('requestId') requestId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.materials.findOneForProject(requestId, projectId, tenantId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: CreateMaterialsRequestDto,
  ) {
    return this.materials.create(projectId, tenantId, user.id, data);
  }

  @Patch(':requestId')
  update(
    @Param('projectId') projectId: string,
    @Param('requestId') requestId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: UpdateMaterialsRequestDto,
  ) {
    return this.materials.update(requestId, projectId, tenantId, user.id, data);
  }

  @Delete(':requestId')
  remove(
    @Param('projectId') projectId: string,
    @Param('requestId') requestId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.materials.remove(requestId, projectId, tenantId);
  }

  @Patch(':requestId/items/:itemId/delivery')
  recordDelivery(
    @Param('projectId') projectId: string,
    @Param('requestId') requestId: string,
    @Param('itemId') itemId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: RecordDeliveryDto,
  ) {
    return this.materials.recordDelivery(
      requestId,
      itemId,
      projectId,
      tenantId,
      data,
    );
  }
}
