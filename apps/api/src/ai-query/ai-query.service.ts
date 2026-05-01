import { BadRequestException, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.module';
import { env } from '../config/env';

const LLM_TIMEOUT_MS = 15_000;

/**
 * Allowlist of v_* views the NL→SQL pipeline is permitted to read from. Any
 * FROM/JOIN target outside this set is rejected. Mirrors the views created in
 * 20260418120000_add_ai_query_views and granted to buildos_app_readonly in
 * 20260430234207_buildos_app_roles.
 */
const ALLOWED_VIEWS = new Set<string>([
  'v_projects',
  'v_users',
  'v_cost_entries',
  'v_rfis',
  'v_daily_logs',
  'v_daily_log_photos',
  'v_attendance_logs',
  'v_materials_requests',
  'v_materials_request_items',
  'v_delay_logs',
  'v_progress_reports',
  'v_drawing_reviews',
  'v_drawing_revisions',
  'v_project_phases',
  'v_project_members',
  'v_project_budget_alert_state',
  'v_project_files',
  'v_invites',
  'v_notifications',
  'v_audit_logs',
]);

/**
 * Identifier-level denylist. Any whole-word match in the post-stripped SQL is
 * rejected. The set covers privilege escalation, tenant-bypass, and information
 * disclosure vectors that the LLM might be tricked into emitting.
 */
const FORBIDDEN_IDENTIFIERS = new Set<string>([
  // DDL/DML
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE',
  'GRANT', 'REVOKE', 'COPY', 'EXECUTE', 'CALL', 'DO',
  // Session/role manipulation
  'SET', 'RESET', 'SET_CONFIG', 'CURRENT_SETTING', 'SET_ROLE', 'RESET_ROLE',
  // Locks/notifications/transactions
  'LISTEN', 'NOTIFY', 'PREPARE', 'DEALLOCATE', 'CLUSTER', 'COMMENT', 'LOCK', 'VACUUM',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'START',
  // Set-combinator we forbid because they can dodge the outer tenant wrapper
  'UNION', 'INTERSECT', 'EXCEPT',
  // Recursive CTEs (can read system catalogs)
  'RECURSIVE',
  // FS / superuser-only functions
  'PG_READ_FILE', 'PG_READ_BINARY_FILE', 'PG_LS_DIR', 'PG_LS_LOGDIR',
  'PG_STAT_FILE', 'LO_IMPORT', 'LO_EXPORT', 'DBLINK',
]);

/**
 * Prefix denylist — any identifier starting with these is rejected. Catches
 * `pg_catalog.*`, `pg_class`, `information_schema.tables`, etc.
 */
const FORBIDDEN_PREFIXES = ['pg_', 'information_schema'];

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

Classify the user's message into exactly one intent: "sql", "explain", or "chat".

intent = "sql" when the user wants NEW data from the database:
- They ask about projects, costs, budgets, RFIs, delays, materials, attendance, logs, phases, team members, drawings, reports, files, notifications, invites, or any question answerable from project records.
- They ask a follow-up that needs a DIFFERENT query (e.g. "now show me by project", "what about last month?", "which ones are overdue?", "break it down by category").

intent = "explain" when the user is asking about, interpreting, or discussing PREVIOUS results:
- They ask how a number was calculated or where it came from (e.g. "how did you get that?", "how did you come about this?", "where does that number come from?")
- They ask what the data means or for interpretation (e.g. "what does that tell us?", "is that good?", "should I be worried?", "what do you think?")
- They ask for clarification of a prior answer (e.g. "can you explain?", "why is it so high?", "what changed?")
- They ask for advice or recommendations based on previous data (e.g. "what should we do about it?", "how can we improve?")
- General rule: if the answer can be given by looking at the conversation history and prior data results WITHOUT running a new query, use "explain".

intent = "chat" for everything else:
- Pure greetings (hi, hey, hello) with no question attached
- Pure thanks (thanks, thank you) with no follow-up question
- Completely off-topic questions unrelated to construction or project management

Respond with ONLY valid JSON (no markdown):
{"intent":"sql"|"explain"|"chat"}
`.trim();

const SQL_SYSTEM = `You are a SQL assistant for BuildOS. Generate a single PostgreSQL SELECT that answers the user's question.

Rules:
- Return ONLY the raw SQL. No markdown fences, no explanation.
- Use $1::uuid as the bound parameter for the tenant UUID (tenant_id = $1::uuid).
- All column and table names are snake_case — no quoting needed.
- Tables without a tenant_id column MUST be scoped by joining v_projects or another tenant-scoped view.
- If the user message is a follow-up, use conversation context to interpret it.

${SCHEMA_CONTEXT}`;

type Intent = 'sql' | 'explain' | 'chat';

@Injectable()
export class AiQueryService implements OnModuleDestroy {
  private readonly logger = new Logger(AiQueryService.name);

  /**
   * Read-only Prisma client used exclusively for executing AI-generated SQL.
   * Connects via BUILDOS_AIQUERY_DATABASE_URL — should point at the
   * buildos_app_readonly role created in B2 (NOBYPASSRLS, SELECT only on v_*).
   *
   * If BUILDOS_AIQUERY_DATABASE_URL is unset, we fall back to the main client
   * with the same parser hardening — works in dev, but production ops should
   * provide a separate URL so the database itself enforces read-only.
   */
  private readonly aiQueryClient: PrismaClient;
  private readonly usingDedicatedRoClient: boolean;

  constructor(private readonly prisma: PrismaService) {
    if (env.BUILDOS_AIQUERY_DATABASE_URL) {
      this.aiQueryClient = new PrismaClient({
        datasourceUrl: env.BUILDOS_AIQUERY_DATABASE_URL,
      });
      this.usingDedicatedRoClient = true;
      this.logger.log('AI Query using dedicated read-only DATABASE_URL (buildos_app_readonly)');
    } else {
      this.aiQueryClient = prisma;
      this.usingDedicatedRoClient = false;
      this.logger.warn(
        'BUILDOS_AIQUERY_DATABASE_URL not set — AI Query will use the main DB role. ' +
          'For production, provision buildos_app_readonly and set BUILDOS_AIQUERY_DATABASE_URL.',
      );
    }
  }

  async onModuleDestroy() {
    if (this.usingDedicatedRoClient) {
      await this.aiQueryClient.$disconnect();
    }
  }

  /**
   * Strip SQL comments (line comments and block comments) and replace string
   * literals with neutral placeholders. We do this BEFORE keyword checks so an
   * attacker can't smuggle keywords inside string literals or behind comments.
   */
  private stripCommentsAndStrings(sql: string): string {
    // Remove block comments first (non-nesting — Postgres allows nesting but we err on strict).
    let out = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
    // Remove line comments.
    out = out.replace(/--[^\n]*/g, ' ');
    // Replace single-quoted string literals (handle '' escapes).
    out = out.replace(/'(?:[^']|'')*'/g, "''");
    // Replace dollar-quoted strings ($tag$...$tag$). Conservative: any $...$ block.
    out = out.replace(/\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$/g, "''");
    return out;
  }

  private validateAndSanitizeSql(sql: string): string {
    // Reject anything obviously not a SELECT first.
    const trimmed = sql.trim();
    if (!/^SELECT\b/i.test(trimmed) && !/^WITH\b/i.test(trimmed)) {
      throw new BadRequestException('Only SELECT queries are allowed');
    }

    if (/;\s*\S/.test(trimmed)) {
      throw new BadRequestException('Multiple SQL statements are not allowed');
    }
    const cleaned = trimmed.replace(/;\s*$/, '');
    const stripped = this.stripCommentsAndStrings(cleaned);
    const upper = stripped.toUpperCase();

    // Identifier-level denylist via word boundaries.
    for (const kw of FORBIDDEN_IDENTIFIERS) {
      // \b doesn't treat `_` as a boundary; we want `SET_CONFIG` to match `set_config(`.
      // Use lookarounds for an alphanumeric/underscore boundary.
      const pattern = new RegExp(`(^|[^A-Z0-9_])${kw}(?=[^A-Z0-9_]|$)`);
      if (pattern.test(upper)) {
        throw new BadRequestException(`Forbidden SQL keyword: ${kw}`);
      }
    }

    // Prefix denylist (pg_*, information_schema.*).
    for (const prefix of FORBIDDEN_PREFIXES) {
      const pattern = new RegExp(`(^|[^A-Z0-9_])${prefix.toUpperCase()}`, 'i');
      if (pattern.test(stripped)) {
        throw new BadRequestException(
          `Forbidden identifier starting with "${prefix}" — system catalogs are off-limits`,
        );
      }
    }

    // Allowlist FROM/JOIN targets — every table reference must be a v_* view.
    // We capture identifiers after FROM and JOIN keywords (skipping aliases like `AS x`).
    const fromJoinRe = /\b(FROM|JOIN)\s+([A-Za-z_][\w.]*)/gi;
    let match: RegExpExecArray | null;
    while ((match = fromJoinRe.exec(stripped))) {
      const ident = match[2];
      // Strip schema prefix if any (e.g. "public.v_projects" → "v_projects").
      const bare = ident.includes('.') ? ident.split('.').pop()! : ident;
      if (!ALLOWED_VIEWS.has(bare.toLowerCase())) {
        throw new BadRequestException(
          `Forbidden table/view reference: "${bare}". Only v_* views are queryable from AI Query.`,
        );
      }
    }

    if (!cleaned.includes('$1')) {
      throw new BadRequestException('Query must include tenant filter ($1 parameter)');
    }

    return cleaned;
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
    enrichedHistory: OpenAI.ChatCompletionMessageParam[],
  ): Promise<Intent> {
    const raw = await this.llmCall(openai, [
      { role: 'system', content: INTENT_SYSTEM },
      ...enrichedHistory.slice(-10),
      { role: 'user', content: question },
    ], { json: true });

    try {
      const parsed = JSON.parse(raw || '{}') as { intent?: string; needs_sql?: boolean };
      const intent = parsed.intent;
      if (intent === 'sql' || intent === 'explain' || intent === 'chat') return intent;
      if (parsed.needs_sql === true) return 'sql';
      if (parsed.needs_sql === false) return 'chat';
      return 'sql';
    } catch {
      this.logger.warn(`AI intent JSON parse failed: ${raw.slice(0, 200)}`);
      return 'sql';
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
    // Wrap the LLM-generated SQL in an outer SELECT * FROM (...) so we can:
    //   1. Cap the row count regardless of what the LLM emitted.
    //   2. Defang any trailing token the LLM might have appended after a comment.
    const wrapped = `SELECT * FROM (${sql}) AS _ai_result LIMIT 200`;

    // Run inside a transaction with set_config so RLS sees the tenant id even
    // when buildos_app_readonly is in use (no BYPASSRLS). Batch tx pins the
    // connection, so set_config and the SELECT share a session.
    const [, result] = await this.aiQueryClient.$transaction([
      this.aiQueryClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
      this.aiQueryClient.$queryRawUnsafe(wrapped, tenantId),
    ]);
    return Array.isArray(result) ? result : [];
  }

  private async chatReply(
    openai: OpenAI,
    dataEnrichedHistory: OpenAI.ChatCompletionMessageParam[],
    question: string,
    systemPrompt: string,
  ): Promise<string> {
    try {
      const reply = await this.llmCall(openai, [
        { role: 'system', content: systemPrompt },
        ...dataEnrichedHistory,
        { role: 'user', content: question },
      ], { temperature: 0.4 });
      return reply || 'I wasn\'t able to formulate a response. Could you try rephrasing your question?';
    } catch {
      return 'I wasn\'t able to formulate a response. Could you try rephrasing your question?';
    }
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

    const dataEnrichedHistory: OpenAI.ChatCompletionMessageParam[] = [];
    for (const m of dbHistory.slice(-12)) {
      dataEnrichedHistory.push({ role: m.role as 'user' | 'assistant', content: m.content });
      if (m.role === 'assistant' && m.resultData) {
        const rd = m.resultData as { rows?: unknown[]; rowCount?: number };
        if (rd.rows?.length) {
          const raw = JSON.stringify(rd.rows.slice(0, 5));
          const preview = raw.length > 2000 ? raw.slice(0, 2000) + '...]' : raw;
          dataEnrichedHistory.push({
            role: 'assistant',
            content: `[Data context: ${rd.rowCount ?? rd.rows.length} rows returned. Sample: ${preview}]`,
          });
        }
      }
    }

    await this.prisma.aiChatMessage.create({
      data: { tenantId, userId, role: 'user', content: question },
    });

    let intent: Intent;
    try {
      intent = await this.classifyIntent(openai, question, dataEnrichedHistory);
    } catch (err) {
      this.logger.warn(`Intent classification failed: ${err}`);
      intent = 'sql';
    }

    const CHAT_SYSTEM =
      'You are the AI assistant for BuildOS, a construction project management app. You help users understand their projects, costs, RFIs, delays, team, and more. Be helpful, professional, and concise (3-5 sentences). If the user greets you, respond warmly and invite them to ask about their project data.';

    const EXPLAIN_SYSTEM =
      'You are the AI assistant for BuildOS, a construction project management app. The user is asking about previous data or results from the conversation. Use the data context provided in the conversation history to explain how the numbers were derived, what they mean, and provide helpful interpretation. Reference specific numbers and SQL queries when available. Be clear, professional, and concise (3-5 sentences).';

    // ── Chat or Explain intent: answer conversationally ──
    if (intent === 'chat' || intent === 'explain') {
      const systemPrompt = intent === 'explain' ? EXPLAIN_SYSTEM : CHAT_SYSTEM;
      const reply = await this.chatReply(openai, dataEnrichedHistory, question, systemPrompt);

      await this.prisma.aiChatMessage.create({
        data: { tenantId, userId, role: 'assistant', content: reply },
      });
      return { answer: reply, sql: '', rows: [], rowCount: 0, error: null };
    }

    // ── SQL intent: generate and execute a query ──
    let sql: string;
    let rows: unknown[] = [];

    try {
      sql = await this.generateSql(openai, question, dataEnrichedHistory);
    } catch (err) {
      this.logger.warn(`SQL generation failed, falling back to chat: ${err}`);
      const fallback = await this.chatReply(openai, dataEnrichedHistory, question, EXPLAIN_SYSTEM);
      await this.prisma.aiChatMessage.create({
        data: { tenantId, userId, role: 'assistant', content: fallback },
      });
      return { answer: fallback, sql: '', rows: [], rowCount: 0, error: null };
    }

    try {
      rows = await this.executeQuery(sql, tenantId);
    } catch (err) {
      const firstError = err instanceof Error ? err.message : 'Query execution failed';
      this.logger.warn(`AI query attempt 1 failed: ${firstError}`);

      try {
        sql = await this.generateSql(openai, question, dataEnrichedHistory, firstError);
        rows = await this.executeQuery(sql, tenantId);
      } catch (retryErr) {
        this.logger.warn(`AI query retry failed, falling back to chat: ${retryErr}`);
        const fallback = await this.chatReply(openai, dataEnrichedHistory, question, EXPLAIN_SYSTEM);
        await this.prisma.aiChatMessage.create({
          data: { tenantId, userId, role: 'assistant', content: fallback },
        });
        return { answer: fallback, sql: '', rows: [], rowCount: 0, error: null };
      }
    }

    // ── Summarize SQL results ──
    let answer: string;
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
        ...dataEnrichedHistory,
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
      error: null,
    };
  }
}
