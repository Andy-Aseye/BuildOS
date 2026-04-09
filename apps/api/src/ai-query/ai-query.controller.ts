import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiQueryService } from './ai-query.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(10_000)
  content: string;
}

class AiQueryDto {
  @IsString()
  @MaxLength(2_000)
  question: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}

@Controller('ai-query')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('OWNER', 'PROJECT_MANAGER')
export class AiQueryController {
  constructor(private readonly aiQuery: AiQueryService) {}

  @Post()
  query(
    @CurrentTenant() tenantId: string,
    @Body() body: AiQueryDto,
  ) {
    if (!body.question?.trim()) {
      return { answer: '', sql: '', rows: [], rowCount: 0 };
    }
    return this.aiQuery.query(tenantId, body.question.trim(), body.history ?? []);
  }
}
