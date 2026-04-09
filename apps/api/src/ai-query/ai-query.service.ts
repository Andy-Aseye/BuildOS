import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.module';
import { env } from '../config/env';

const SCHEMA_CONTEXT = `
Tables (PostgreSQL, all snake_case columns):
- projects (id uuid, tenant_id uuid, code text, name text, client_name text, description text, status text [ACTIVE|ON_HOLD|COMPLETED|CANCELLED], budget_ghs numeric, budget_usd numeric, start_date timestamp, expected_end_date timestamp, created_at timestamp, deleted_at timestamp nullable)
- rfis (id uuid, project_id uuid, tenant_id uuid, reference_no text, title text, description text, status text [OPEN|ACKNOWLEDGED|ANSWERED|CLOSED], due_date timestamp, response text, raised_by_id uuid, assigned_to_id uuid, responded_at timestamp, closed_at timestamp, created_at timestamp)
- cost_entries (id uuid, project_id uuid, tenant_id uuid, description text, category text [MATERIALS|LABOUR|EQUIPMENT|SUBCONTRACTORS|TRANSPORT|MISCELLANEOUS], currency text [GHS|USD], amount numeric, status text [PENDING_CONFIRMATION|CONFIRMED|REJECTED], source text, entry_date timestamp, deleted_at timestamp nullable)
- daily_logs (id uuid, project_id uuid, tenant_id uuid, log_date timestamp, raw_content text, ai_summary text, activities text[], incidents text[], weather text, source text, submitted_by_id uuid)
- attendance_logs (id uuid, project_id uuid, tenant_id uuid, log_date timestamp, worker_count int, reported_by_id uuid)
- materials_requests (id uuid, project_id uuid, tenant_id uuid, status text, estimated_total numeric, currency text, notes text, created_at timestamp)
- materials_request_items (id uuid, materials_request_id uuid, description text, quantity numeric, unit text, estimated_unit_cost numeric, delivered_quantity numeric, delivered_at timestamp)
- delay_logs (id uuid, project_id uuid, tenant_id uuid, delay_date timestamp, duration_hours numeric, cause text [WEATHER|MATERIALS|LABOUR|DESIGN|CLIENT|UTILITIES|OTHER], description text, reported_by_id uuid)
- project_phases (id uuid, project_id uuid, name text, percent_complete int, status text [NOT_STARTED|IN_PROGRESS|AT_RISK|DELAYED|COMPLETED], planned_start timestamp, planned_end timestamp)
- users (id uuid, tenant_id uuid, email text, name text, role text [OWNER|PROJECT_MANAGER|ARCHITECT|FOREMAN|FIELD_WORKER], whatsapp_phone text, is_active boolean)
- progress_reports (id uuid, project_id uuid, tenant_id uuid, period_start timestamp, period_end timestamp, narrative_summary text, generated_at timestamp)
- drawing_reviews (id uuid, project_id uuid, tenant_id uuid, title text, status text [DRAFT|SUBMITTED|UNDER_REVIEW|REVISION_REQUIRED|RESUBMITTED|APPROVED])
- project_members (id uuid, project_id uuid, user_id uuid, role text)

IMPORTANT:
- Always filter by tenant_id = $1 for data security.
- Only generate SELECT statements. Never INSERT, UPDATE, DELETE, DROP, or ALTER.
- Use proper joins when crossing tables. 
- For deleted records, filter WHERE deleted_at IS NULL when the table has that column.
- Return human-readable column aliases.
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

  async query(
    tenantId: string,
    question: string,
    history: ChatMessage[] = [],
  ) {
    const key = env.OPENAI_API_KEY;
    if (!key) throw new BadRequestException('OPENAI_API_KEY not configured');

    const openai = new OpenAI({ apiKey: key });

    const historyMessages: OpenAI.ChatCompletionMessageParam[] = history
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const sqlCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a SQL assistant for a construction management platform called BuildOS. Given a natural language question about project data, generate a single PostgreSQL SELECT query.\n\nRules:\n- Return ONLY the raw SQL with $1 as the tenant_id parameter placeholder.\n- No markdown fences, no explanation, just the SQL.\n- If the user asks a follow-up, use context from the conversation to understand what they mean.\n\n${SCHEMA_CONTEXT}`,
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
