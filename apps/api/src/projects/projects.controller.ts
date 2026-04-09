import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto } from './projects.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@Controller('projects')
@UseGuards(AuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.projects.findAll(tenantId);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() data: CreateProjectDto) {
    return this.projects.create(tenantId, data);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projects.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: UpdateProjectDto,
  ) {
    return this.projects.update(id, tenantId, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projects.softDelete(id, tenantId);
  }

  @Post(':id/members')
  addMember(
    @Param('id') projectId: string,
    @CurrentTenant() tenantId: string,
    @Body() data: AddMemberDto,
  ) {
    return this.projects.addMember(projectId, tenantId, data);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.projects.removeMember(projectId, tenantId, userId);
  }
}
