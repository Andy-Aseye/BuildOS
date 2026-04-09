import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiQueryService } from './ai-query.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

@Controller('ai-query')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('OWNER', 'PROJECT_MANAGER')
export class AiQueryController {
  constructor(private readonly aiQuery: AiQueryService) {}

  @Post()
  query(
    @CurrentTenant() tenantId: string,
    @Body('question') question: string,
    @Body('history') history?: ChatMessage[],
  ) {
    if (!question?.trim()) {
      return { answer: '', sql: '', rows: [], rowCount: 0 };
    }
    return this.aiQuery.query(tenantId, question.trim(), history ?? []);
  }
}
