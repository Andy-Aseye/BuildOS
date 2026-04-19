import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import {
  IsString,
  MaxLength,
} from 'class-validator';
import { AiQueryService } from './ai-query.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class AiQueryDto {
  @IsString()
  @MaxLength(2_000)
  question: string;
}

@Controller('ai-query')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('OWNER', 'PROJECT_MANAGER')
export class AiQueryController {
  constructor(private readonly aiQuery: AiQueryService) {}

  @Post()
  query(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() body: AiQueryDto,
  ) {
    if (!body.question?.trim()) {
      return { answer: '', sql: '', rows: [], rowCount: 0, error: null };
    }
    return this.aiQuery.query(tenantId, user.id, body.question.trim());
  }

  @Get('history')
  history(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.aiQuery.getHistory(tenantId, user.id);
  }

  @Delete('history')
  clearHistory(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.aiQuery.clearHistory(tenantId, user.id);
  }
}
