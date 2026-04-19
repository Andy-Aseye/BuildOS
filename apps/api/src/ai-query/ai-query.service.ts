import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.module';
import { env } from '../config/env';

const LLM_TIMEOUT_MS = 15_000;

const SCHEMA_CONTEXT = `
PostgreSQL schema for BuildOS. All views use snake_case columns — no quoting needed.

TABLES WITH tenant_id (filter with WHERE tenant_id = $1::uuid):
- v_projects (id, tenant_id, code, name, client_name, description, status, budget_ghs, budget_usd, fx_rate_ghs_usd, start_date, expected_end_date, actual_end_date, created_at, updated_at, deleted_at)
- v_users (id, tenant_id, email, whatsapp_phone, name, role, is_active, last_active_at, created_at, updated_at, deleted_at)
- v_cost_entries (id, project_id, tenant_id, source, status, description, category, currency, amount, fx_rate_at_entry, logged_by_id, confirmed_by_id, confirmed_at, rejection_reason, raw_message_id, entry_date, created_at, updated_at, deleted_at)
- v_rfis (id, project_id, tenant_id, reference_no, title, description, linked_drawing_id, status, raised_by_id, assigned_to_id, due_date, response, responded_at, closed_at, raw_message_id, created_at, updated_at)
- v_daily_logs (id, project_id, tenant_id, log_date, submitted_by_id, raw_content, ai_summary, activities, materials, incidents, weather, source, raw_message_id, created_at)
- v_attendance_logs (id, project_id, tenant_id, log_date, worker_count, reported_by_id, raw_message_id, confirmed_at, created_at)
- v_materials_requests (id, project_id, tenant_id, requested_by_id, status, estimated_total, currency, notes, requires_owner_approval, approved_by_id, approved_at, rejection_reason, cost_entry_id, created_at, updated_at)
- v_delay_logs (id, project_id, tenant_id, delay_date, duration_hours, cause, description, reported_by_id, reviewed_by_pm, cause_override_note, raw_message_id, linked_rfi_id, created_at, updated_at)
- v_progress_reports (id, project_id, tenant_id, period_start, period_end, generated_at, generated_by_id, narrative_summary, storage_url, sent_to_email, sent_at)
- v_drawing_reviews (id, project_id, tenant_id, title, description, status, submitted_by_id, reviewer_id, created_at, updated_at)
- v_project_budget_alert_state (id, project_id, tenant_id, last_ghs_level, last_usd_level, created_at, updated_at)
- v_project_files (id, project_id, tenant_id, name, folder, storage_url, file_size, mime_type, uploaded_by_id, created_at, deleted_at)
- v_invites (id, tenant_id, email, name, phone, role, invited_by_id, expires_at, accepted_at, created_at)
- v_notifications (id, tenant_id, user_id, type, title, body, link, read, created_at)
- v_audit_logs (id, tenant_id, actor_id, action, entity_type, entity_id, old_values, new_values, metadata, created_at)

NO tenant_id — scope via JOIN:
- v_project_members (id, project_id, user_id, role, joined_at, left_at)
  → JOIN v_projects p ON p.id = pm.project_id AND p.tenant_id = $1::uuid
- v_project_phases (id, project_id, name, phase_order, planned_start, planned_end, actual_start, actual_end, percent_complete, status, notes, created_at, updated_at)
  → JOIN v_projects p ON p.id = pp.project_id AND p.tenant_id = $1::uuid
- v_materials_request_items (id, materials_request_id, description, quantity, unit, estimated_unit_cost, delivered_quantity, delivered_at)
  → JOIN v_materials_requests mr ON mr.id = mri.materials_request_id AND mr.tenant_id = $1::uuid
- v_daily_log_photos (id, daily_log_id, storage_url, caption, taken_at, created_at)
  → JOIN v_daily_logs dl ON dl.id = dlp.daily_log_id AND dl.tenant_id = $1::uuid
- v_drawing_revisions (id, drawing_review_id, revision_number, storage_url, file_size, mime_type, uploaded_by_id, comments, reviewed_at, reviewed_by_id, created_at)
  → JOIN v_drawing_reviews dr ON dr.id = drev.drawing_review_id AND dr.tenant_id = $1::uuid

ENUM VALUES:
- status on v_projects: ACTIVE, ON_HOLD, COMPLETED, CANCELLED
- role on v_users: OWNER, PROJECT_MANAGER, ARCHITECT, FOREMAN, FIELD_WORKER
- status on v_cost_entries: PENDING_CONFIRMATION, CONFIRMED, REJECTED
- category on v_cost_entries: MATERIALS, LABOUR, EQUIPMENT, SUBCONTRACTORS, TRANSPORT, MISCELLANEOUS
- currency: GHS, USD
- source on v_cost_entries: WHATSAPP_AI, MANUAL
- status on v_rfis: OPEN, ACKNOWLEDGED, ANSWERED, CLOSED
- status on v_materials_requests: DRAFT, SUBMITTED, AWAITING_APPROVAL, APPROVED, REJECTED, ORDERED, PARTIALLY_DELIVERED, DELIVERED, CANCELLED
- cause on v_delay_logs: WEATHER, MATERIALS, LABOUR, DESIGN, CLIENT, UTILITIES, OTHER
- status on v_drawing_reviews: DRAFT, SUBMITTED, UNDER_REVIEW, REVISION_REQUIRED, RESUBMITTED, APPROVED
- status on v_project_phases: NOT_STARTED, IN_PROGRESS, AT_RISK, DELAYED, COMPLETED
- folder on v_project_files: DRAWINGS, CONTRACTS, PERMITS, REPORTS, OTHER

RULES:
- Every SELECT must be scoped to this tenant: use tenant_id = $1::uuid on tables that have it; for tables without it, join through v_projects or v_materials_requests.
- ALWAYS cast the parameter as $1::uuid.
- Only SELECT. Never INSERT, UPDATE, DELETE, DROP, ALTER.
- For v_projects and v_users rows, filter deleted_at IS NULL unless the user explicitly asks about deleted records.
- For v_cost_entries filter deleted_at IS NULL unless asked about deleted entries.
- Use clear column aliases (AS) for computed columns.
`.trim();

const INTENT_SYSTEM = `You route messages for BuildOS, a construction management app assistant.

Decide if the user wants to query their organization's project data from the database, or if they are chatting (greeting, thanks, empty, off-topic, or not a data question).

needs_sql = true when they ask about projects, costs, budgets, RFIs, delays, materials, attendance, logs, phases, team members, drawings, reports, files, notifications, invites, or any question answerable from project records.

needs_sql = false for greetings (hi, hey, hello), thanks, small talk, jokes, or when they give no concrete question.

Respond with ONLY valid JSON (no markdown):
{"needs_sql":boolean,"chat_message":string}

When needs_sql is false, chat_message must be a short friendly reply (1-3 sentences) inviting them to ask about projects, costs, RFIs, or team data.
When needs_sql is true, set chat_message to an empty string "".
`.trim();

const SQL_SYSTEM = `You are a SQL assistant for BuildOS. Generate a single PostgreSQL SELECT that answers the user's question.

Rules:
- Return ONLY the raw SQL. No markdown fences, no explanation.
- Use $1::uuid as the bound parameter for the tenant UUID (tenant_id = $1::uuid).
- All column and table names are snake_case — no quoting needed.
- Tables without a tenant_id column MUST be scoped by joining v_projects or another tenant-scoped view.
- If the user message is a follow-up, use conversation context to interpret it.

${SCHEMA_CONTEXT}`;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class AiQueryService {
  private readonly logger = new Logger(AiQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private validateAndSanitizeSql(sql: string): string {
    const upper = sql.toUpperCase();

    const forbidden = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
      'CREATE', 'GRANT', 'REVOKE', 'COPY', 'EXECUTE', 'DO ',
      'CALL', 'SET ', 'RESET', 'LISTEN', 'NOTIFY', 'PREPARE',
      'DEALLOCATE', 'CLUSTER', 'COMMENT', 'LOCK', 'VACUUM',
    ];

    for (const kw of forbidden) {
      const pattern = new RegExp(`\\b${kw.trim()}\\b`);
      if (pattern.test(upper)) {
        throw new BadRequestException(`Forbidden SQL keyword: ${kw.trim()}`);
      }
    }

    if (!upper.startsWith('SELECT')) {
      throw new BadRequestException('Only SELECT queries are allowed');
    }

    if (/;\s*\S/.test(sql)) {
      throw new BadRequestException('Multiple SQL statements are not allowed');
    }

    sql = sql.replace(/;\s*$/, '');

    if (!sql.includes('$1')) {
      throw new BadRequestException('Query must include tenant filter ($1 parameter)');
    }

    return sql;
  }

  private async llmCall(
    openai: OpenAI,
    messages: OpenAI.ChatCompletionMessageParam[],
    opts: { temperature?: number; json?: boolean } = {},
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    try {
      const res = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          temperature: opts.temperature ?? 0,
          ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
          messages,
        },
        { signal: controller.signal },
      );
      return res.choices[0]?.message?.content?.trim() ?? '';
    } finally {
      clearTimeout(timer);
    }
  }

  private async classifyIntent(
    openai: OpenAI,
    question: string,
    history: ChatMessage[],
  ): Promise<{ needsSql: boolean; chatMessage: string }> {
    const historyMessages: OpenAI.ChatCompletionMessageParam[] = history
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    const raw = await this.llmCall(openai, [
      { role: 'system', content: INTENT_SYSTEM },
      ...historyMessages,
      { role: 'user', content: question },
    ], { json: true });

    try {
      const parsed = JSON.parse(raw || '{}') as { needs_sql?: unknown; chat_message?: unknown };
      const needsSql = parsed.needs_sql === true;
      const chatMessage =
        typeof parsed.chat_message === 'string' ? parsed.chat_message.trim() : '';
      if (!needsSql) {
        return {
          needsSql: false,
          chatMessage:
            chatMessage ||
            'Hi! Ask me about your projects, costs, RFIs, delays, or team — in plain English.',
        };
      }
      return { needsSql: true, chatMessage: '' };
    } catch {
      this.logger.warn(`AI intent JSON parse failed: ${raw.slice(0, 200)}`);
      return { needsSql: true, chatMessage: '' };
    }
  }

  private async generateSql(
    openai: OpenAI,
    question: string,
    history: OpenAI.ChatCompletionMessageParam[],
    errorContext?: string,
  ): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SQL_SYSTEM },
      ...history,
      { role: 'user', content: question },
    ];

    if (errorContext) {
      messages.push({
        role: 'user',
        content: `The previous SQL failed with this error:\n${errorContext}\nPlease fix it and return only the corrected SQL.`,
      });
    }

    let sql = await this.llmCall(openai, messages);
    sql = sql.replace(/^```\w*\n?/m, '').replace(/\n?```$/m, '').trim();
    return this.validateAndSanitizeSql(sql);
  }

  private async executeQuery(sql: string, tenantId: string): Promise<unknown[]> {
    const result = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM (${sql}) AS _ai_result LIMIT 200`,
      tenantId,
    );
    return Array.isArray(result) ? result : [];
  }

  async getHistory(tenantId: string, userId: string) {
    return this.prisma.aiChatMessage.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async clearHistory(tenantId: string, userId: string) {
    await this.prisma.aiChatMessage.deleteMany({
      where: { tenantId, userId },
    });
  }

  async query(
    tenantId: string,
    userId: string,
    question: string,
  ) {
    const key = env.OPENAI_API_KEY;
    if (!key) throw new BadRequestException('AI assistant is not configured. Please contact your administrator.');

    const openai = new OpenAI({ apiKey: key });

    const dbHistory = await this.prisma.aiChatMessage.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const history: ChatMessage[] = dbHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    await this.prisma.aiChatMessage.create({
      data: { tenantId, userId, role: 'user', content: question },
    });

    let intent: { needsSql: boolean; chatMessage: string };
    try {
      intent = await this.classifyIntent(openai, question, history);
    } catch (err) {
      this.logger.warn(`Intent classification failed: ${err}`);
      intent = { needsSql: true, chatMessage: '' };
    }

    if (!intent.needsSql) {
      await this.prisma.aiChatMessage.create({
        data: { tenantId, userId, role: 'assistant', content: intent.chatMessage },
      });
      return {
        answer: intent.chatMessage,
        sql: '',
        rows: [],
        rowCount: 0,
        error: null,
      };
    }

    const historyMessages: OpenAI.ChatCompletionMessageParam[] = history
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    let sql: string;
    let rows: unknown[] = [];
    let queryError: string | null = null;

    try {
      sql = await this.generateSql(openai, question, historyMessages);
    } catch (err) {
      this.logger.warn(`SQL generation failed: ${err}`);
      const errAnswer = 'I had trouble understanding that question. Could you rephrase it?';
      await this.prisma.aiChatMessage.create({
        data: { tenantId, userId, role: 'assistant', content: errAnswer },
      });
      return { answer: errAnswer, sql: '', rows: [], rowCount: 0, error: 'SQL generation failed' };
    }

    try {
      rows = await this.executeQuery(sql, tenantId);
    } catch (err) {
      const firstError = err instanceof Error ? err.message : 'Query execution failed';
      this.logger.warn(`AI query attempt 1 failed: ${firstError}`);

      try {
        sql = await this.generateSql(openai, question, historyMessages, firstError);
        rows = await this.executeQuery(sql, tenantId);
      } catch (retryErr) {
        this.logger.warn(`AI query retry failed: ${retryErr}`);
        queryError = 'Query execution failed';
      }
    }

    let answer: string;
    if (queryError) {
      answer = "I wasn't able to retrieve that data. Could you try rephrasing your question?";
    } else {
      try {
        const dataPreview = JSON.stringify(rows.slice(0, 20), (_k, v) =>
          typeof v === 'bigint' ? Number(v) : v,
        );

        answer = await this.llmCall(openai, [
          {
            role: 'system',
            content:
              'You are a helpful assistant for a construction project management app. Given a user question and query results, provide a clear, concise natural language answer. Use specific numbers from the data. Be direct and professional. If the data is empty, say so helpfully. Keep answers to 2-4 sentences unless the user asked for detail.',
          },
          ...historyMessages,
          {
            role: 'user',
            content: `Question: ${question}\n\nQuery returned ${rows.length} rows. Data:\n${dataPreview}`,
          },
        ], { temperature: 0.3 });

        if (!answer) {
          answer = rows.length
            ? `Found ${rows.length} result${rows.length === 1 ? '' : 's'}.`
            : 'No matching data found.';
        }
      } catch {
        answer = rows.length
          ? `Found ${rows.length} result${rows.length === 1 ? '' : 's'}.`
          : 'No matching data found.';
      }
    }

    const serializedRows = rows.map((r) => {
      if (typeof r !== 'object' || r === null) return r;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
        out[k] = typeof v === 'bigint' ? Number(v) : v;
      }
      return out;
    });

    await this.prisma.aiChatMessage.create({
      data: {
        tenantId,
        userId,
        role: 'assistant',
        content: answer,
        sqlQuery: sql,
        resultData: rows.length > 0 ? JSON.parse(JSON.stringify({ rows: serializedRows.slice(0, 50), rowCount: rows.length })) : undefined,
      },
    });

    return {
      answer,
      sql,
      rows: serializedRows,
      rowCount: rows.length,
      error: queryError,
    };
  }
}
