import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PhasesService } from './phases.service';
import { CreatePhaseDto, UpdatePhaseDto } from './phases.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@Controller('projects/:projectId/phases')
@UseGuards(AuthGuard, TenantGuard)
export class PhasesController {
  constructor(private readonly phases: PhasesService) {}

  @Get()
  list(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.phases.findAll(projectId, tenantId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: CreatePhaseDto,
  ) {
    return this.phases.create(projectId, tenantId, data);
  }

  @Patch(':phaseId')
  update(
    @Param('phaseId') phaseId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: UpdatePhaseDto,
  ) {
    return this.phases.update(phaseId, tenantId, data);
  }

  @Delete(':phaseId')
  remove(@Param('phaseId') phaseId: string, @CurrentTenant() tenantId: string) {
    return this.phases.delete(phaseId, tenantId);
  }
}
