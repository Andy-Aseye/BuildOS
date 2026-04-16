import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.module';
import { env } from '../config/env';

/** Tables that have a real tenant_id column — use ... WHERE tenant_id = $1 (and join from here). */
const SCHEMA_CONTEXT = `
PostgreSQL schema (snake_case column names in the database):

DIRECT tenant_id (filter with WHERE tenant_id = $1 or AND table.tenant_id = $1):
- projects (id, tenant_id, code, name, client_name, description, status, budget_ghs, budget_usd, start_date, expected_end_date, created_at, deleted_at)
- users (id, tenant_id, email, name, role, whatsapp_phone, is_active, deleted_at)
- rfis (id, project_id, tenant_id, reference_no, title, description, status, due_date, response, raised_by_id, assigned_to_id, responded_at, closed_at, created_at)
- cost_entries (id, project_id, tenant_id, description, category, currency, amount, status, source, entry_date, deleted_at)
- daily_logs (id, project_id, tenant_id, log_date, raw_content, ai_summary, activities, incidents, weather, source, submitted_by_id)
- attendance_logs (id, project_id, tenant_id, log_date, worker_count, reported_by_id)
- materials_requests (id, project_id, tenant_id, status, estimated_total, currency, notes, created_at)
- delay_logs (id, project_id, tenant_id, delay_date, duration_hours, cause, description, reported_by_id)
- progress_reports (id, project_id, tenant_id, period_start, period_end, narrative_summary, generated_at)
- drawing_reviews (id, project_id, tenant_id, title, status)
- project_budget_alert_state (id, project_id, tenant_id, last_ghs_level, last_usd_level)

NO tenant_id column — scope ONLY via join (do NOT write tenant_id on these tables):
- project_members (id, project_id, user_id, role, joined_at, left_at)
  → INNER JOIN projects p ON p.id = project_members.project_id AND p.tenant_id = $1
- project_phases (id, project_id, name, "order", planned_start, planned_end, percent_complete, status, …)
  → INNER JOIN projects p ON p.id = project_phases.project_id AND p.tenant_id = $1
- materials_request_items (id, materials_request_id, description, quantity, unit, …)
  → INNER JOIN materials_requests mr ON mr.id = materials_request_items.materials_request_id AND mr.tenant_id = $1

IMPORTANT:
- Every SELECT must be scoped to this tenant: use tenant_id = $1 only on tables that have it; for tables without it, join through projects or materials_requests as above.
- Only SELECT. Never INSERT, UPDATE, DELETE, DROP, ALTER.
- For projects and users rows, filter deleted_at IS NULL when the column exists.
- Use clear column aliases (AS).
`.trim();

const INTENT_SYSTEM = `You route messages for BuildOS, a construction management app assistant.

Decide if the user wants to query their organization's project data from the database, or if they are chatting (greeting, thanks, empty, off-topic, or not a data question).

needs_sql = true when they ask about projects, costs, budgets, RFIs, delays, materials, attendance, logs, phases, team members, drawings, reports, or any question answerable from project records.

needs_sql = false for greetings (hi, hey, hello), thanks, small talk, jokes, or when they give no concrete question.

Respond with ONLY valid JSON (no markdown):
{"needs_sql":boolean,"chat_message":string}

When needs_sql is false, chat_message must be a short friendly reply (1-3 sentences) inviting them to ask about projects, costs, RFIs, or team data.
When needs_sql is true, set chat_message to an empty string "".
`.trim();

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
      throw new BadRequestException('Query must filter by tenant_id ($1 parameter)');
    }

    return sql;
  }

  /** Routes greetings / small talk away from SQL generation. */
  private async classifyIntent(
    openai: OpenAI,
    question: string,
    history: ChatMessage[],
  ): Promise<{ needsSql: boolean; chatMessage: string }> {
    const historyMessages: OpenAI.ChatCompletionMessageParam[] = history
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: INTENT_SYSTEM },
        ...historyMessages,
        { role: 'user', content: question },
      ],
    });

    const raw = res.choices[0]?.message?.content?.trim() ?? '{}';
    try {
      const parsed = JSON.parse(raw) as { needs_sql?: unknown; chat_message?: unknown };
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

  async query(
    tenantId: string,
    question: string,
    history: ChatMessage[] = [],
  ) {
    const key = env.OPENAI_API_KEY;
    if (!key) throw new BadRequestException('OPENAI_API_KEY not configured');

    const openai = new OpenAI({ apiKey: key });

    const intent = await this.classifyIntent(openai, question, history);
    if (!intent.needsSql) {
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

    const sqlCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a SQL assistant for BuildOS. Generate a single PostgreSQL SELECT that answers the user's question.

Rules:
- Return ONLY the raw SQL. Use $1 as the bound parameter for the tenant UUID (tenant_id filters or p.tenant_id = $1 in joins).
- No markdown fences, no explanation.
- Tables without a tenant_id column MUST be scoped by joining projects AS p ON p.id = <child>.project_id AND p.tenant_id = $1, or materials_requests AS mr ON mr.id = materials_request_items.materials_request_id AND mr.tenant_id = $1.
- If the user message is a follow-up, use conversation context to interpret it.

${SCHEMA_CONTEXT}`,
        },
        ...historyMessages,
        { role: 'user', content: question },
      ],
    });

    let sql = (sqlCompletion.choices[0]?.message?.content ?? '').trim();
    sql = sql.replace(/^```\w*\n?/m, '').replace(/\n?```$/m, '').trim();

    sql = this.validateAndSanitizeSql(sql);

    let rows: unknown[] = [];
    let queryError: string | null = null;

    try {
      const result = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM (${sql}) AS _ai_result LIMIT 200`,
        tenantId,
      );
      rows = Array.isArray(result) ? result : [];
    } catch (err) {
      this.logger.warn(`AI query SQL error: ${err}`);
      queryError = err instanceof Error ? err.message : 'Query execution failed';
    }

    let answer: string;
    if (queryError) {
      answer = `I tried to query the data but ran into a technical issue. Could you rephrase your question? (Error: ${queryError})`;
    } else {
      try {
        const dataPreview = JSON.stringify(rows.slice(0, 20), (_k, v) =>
          typeof v === 'bigint' ? Number(v) : v,
        );

        const answerCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          messages: [
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
          ],
        });

        answer = answerCompletion.choices[0]?.message?.content?.trim() ?? 'Here are your results.';
      } catch {
        answer = rows.length
          ? `Found ${rows.length} result${rows.length === 1 ? '' : 's'}.`
          : 'No matching data found.';
      }
    }

    return {
      answer,
      sql,
      rows: rows.map((r) => {
        if (typeof r !== 'object' || r === null) return r;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
          out[k] = typeof v === 'bigint' ? Number(v) : v;
        }
        return out;
      }),
      rowCount: rows.length,
      error: queryError,
    };
  }
}
