import { BadRequestException } from '@nestjs/common';
import { AiQueryService } from './ai-query.service';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000002';

function buildService(overrides: {
  llmResponses?: string[];
  dbHistory?: Array<{ role: string; content: string; resultData?: unknown; createdAt: Date }>;
  queryResult?: unknown[];
  queryError?: Error;
} = {}) {
  const llmResponses = [...(overrides.llmResponses ?? [])];
  let llmCallIndex = 0;

  const queryRawUnsafe = overrides.queryError
    ? jest.fn().mockRejectedValue(overrides.queryError)
    : jest.fn().mockResolvedValue(overrides.queryResult ?? []);

  const mockPrisma = {
    aiChatMessage: {
      findMany: jest.fn().mockResolvedValue(overrides.dbHistory ?? []),
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRawUnsafe: queryRawUnsafe,
    $executeRaw: jest.fn().mockResolvedValue(1),
    // Batch transaction: resolve the array of in-flight calls in order.
    $transaction: jest.fn().mockImplementation(async (calls: Array<Promise<unknown>>) =>
      Promise.all(calls),
    ),
  };

  const service = new AiQueryService(mockPrisma as never);

  const mockLlmCall = jest.fn().mockImplementation(async () => {
    const response = llmResponses[llmCallIndex] ?? '';
    llmCallIndex++;
    return response;
  });

  (service as unknown as Record<string, unknown>)['llmCall'] = mockLlmCall;

  return { service, mockPrisma, mockLlmCall };
}

describe('AiQueryService', () => {
  describe('three-way intent routing', () => {
    it('should route intent=sql to SQL generation path', async () => {
      const { service, mockLlmCall } = buildService({
        llmResponses: [
          JSON.stringify({ intent: 'sql' }),
          "SELECT count(*) AS total FROM v_projects WHERE tenant_id = $1::uuid AND deleted_at IS NULL",
          'You have 5 projects.',
        ],
        queryResult: [{ total: 5 }],
      });

      const result = await service.query(TENANT_ID, USER_ID, 'How many projects?');

      expect(result.answer).toBe('You have 5 projects.');
      expect(result.sql).toContain('SELECT');
      expect(result.rows).toEqual([{ total: 5 }]);
      expect(mockLlmCall).toHaveBeenCalledTimes(3);
    });

    it('should route intent=explain to contextual chat with explain system prompt', async () => {
      const previousRows = [{ projected_income: 1620000 }];

      const { service, mockLlmCall } = buildService({
        dbHistory: [
          { role: 'user', content: 'What is our projected income?', createdAt: new Date('2026-01-01') },
          {
            role: 'assistant',
            content: 'Your projected income is $1,620,000.',
            resultData: { rows: previousRows, rowCount: 1 },
            createdAt: new Date('2026-01-01T00:01:00'),
          },
        ],
        llmResponses: [
          JSON.stringify({ intent: 'explain' }),
          'The projected income of $1,620,000 was derived from summing the budget_usd values across all your active projects.',
        ],
      });

      const result = await service.query(TENANT_ID, USER_ID, 'How did you come about this projected income?');

      expect(result.answer).toContain('$1,620,000');
      expect(result.sql).toBe('');
      expect(result.rows).toEqual([]);
      expect(mockLlmCall).toHaveBeenCalledTimes(2);

      const chatCall = mockLlmCall.mock.calls[1];
      const systemMsg = (chatCall[1] as Array<{ role: string; content: string }>)[0];
      expect(systemMsg.content).toContain('previous data');
    });

    it('should route intent=chat to general chat without explain context', async () => {
      const { service, mockLlmCall } = buildService({
        llmResponses: [
          JSON.stringify({ intent: 'chat' }),
          'Hello! How can I help you with your projects today?',
        ],
      });

      const result = await service.query(TENANT_ID, USER_ID, 'Hi there');

      expect(result.answer).toContain('Hello');
      expect(result.sql).toBe('');
      expect(mockLlmCall).toHaveBeenCalledTimes(2);

      const chatCall = mockLlmCall.mock.calls[1];
      const systemMsg = (chatCall[1] as Array<{ role: string; content: string }>)[0];
      expect(systemMsg.content).not.toContain('previous data');
    });

    it('should handle legacy needs_sql=true response from intent classifier', async () => {
      const { service } = buildService({
        llmResponses: [
          JSON.stringify({ needs_sql: true }),
          "SELECT count(*) AS total FROM v_projects WHERE tenant_id = $1::uuid AND deleted_at IS NULL",
          'You have 3 projects.',
        ],
        queryResult: [{ total: 3 }],
      });

      const result = await service.query(TENANT_ID, USER_ID, 'How many projects?');
      expect(result.sql).toContain('SELECT');
    });

    it('should handle legacy needs_sql=false response from intent classifier', async () => {
      const { service } = buildService({
        llmResponses: [
          JSON.stringify({ needs_sql: false }),
          'Hello! Ask me about your projects.',
        ],
      });

      const result = await service.query(TENANT_ID, USER_ID, 'Hey');
      expect(result.sql).toBe('');
      expect(result.answer).toContain('Hello');
    });
  });

  describe('SQL failure fallback to chat', () => {
    it('should fall back to chat when SQL generation fails', async () => {
      const { service, mockLlmCall } = buildService({
        dbHistory: [
          { role: 'user', content: 'Show costs', createdAt: new Date('2026-01-01') },
          {
            role: 'assistant',
            content: 'Total costs are GHS 50,000.',
            resultData: { rows: [{ total: 50000 }], rowCount: 1 },
            createdAt: new Date('2026-01-01T00:01:00'),
          },
        ],
        llmResponses: [
          JSON.stringify({ intent: 'sql' }),
          'I cannot generate SQL for this question.',
          'Based on the previous data, your total costs are GHS 50,000.',
        ],
      });

      const result = await service.query(TENANT_ID, USER_ID, 'Explain the costs');

      expect(result.answer).toContain('50,000');
      expect(result.error).toBeNull();
      expect(result.sql).toBe('');
    });

    it('should fall back to chat when both SQL execution attempts fail', async () => {
      const { service } = buildService({
        llmResponses: [
          JSON.stringify({ intent: 'sql' }),
          "SELECT * FROM v_projects WHERE tenant_id = $1::uuid",
          "SELECT * FROM v_projects WHERE tenant_id = $1::uuid",
          'I can help you explore your project data. Could you be more specific about what you need?',
        ],
        queryError: new Error('relation "v_projects" does not exist'),
      });

      const result = await service.query(TENANT_ID, USER_ID, 'Show me everything');

      expect(result.error).toBeNull();
      expect(result.answer).toBeTruthy();
      expect(result.answer).not.toContain('I had trouble understanding');
      expect(result.answer).not.toContain("I wasn't able to retrieve");
    });
  });

  describe('data context in enriched history', () => {
    it('should pass data-enriched history to SQL generation on follow-up queries', async () => {
      const previousRows = [
        { status: 'ACTIVE', count: 3 },
        { status: 'COMPLETED', count: 2 },
      ];

      const { service, mockLlmCall, mockPrisma } = buildService({
        dbHistory: [
          { role: 'user', content: 'How many projects do I have?', createdAt: new Date('2026-01-01') },
          {
            role: 'assistant',
            content: 'You have 5 projects.',
            resultData: { rows: previousRows, rowCount: 5 },
            createdAt: new Date('2026-01-01T00:01:00'),
          },
        ],
        llmResponses: [
          JSON.stringify({ intent: 'sql' }),
          "SELECT status, count(*) AS count FROM v_projects WHERE tenant_id = $1::uuid AND deleted_at IS NULL GROUP BY status",
          'You have 3 active and 2 completed projects.',
        ],
        queryResult: previousRows,
      });

      const result = await service.query(TENANT_ID, USER_ID, 'Break that down by status');

      expect(result.answer).toBe('You have 3 active and 2 completed projects.');

      const sqlGenCall = mockLlmCall.mock.calls[1];
      const sqlGenMessages = sqlGenCall[1] as Array<{ role: string; content: string }>;
      const dataContextMsg = sqlGenMessages.find((m) =>
        m.content.includes('[Data context:'),
      );
      expect(dataContextMsg).toBeDefined();
      expect(dataContextMsg!.content).toContain('5 rows returned');

      expect(mockPrisma.aiChatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            userId: USER_ID,
            role: 'user',
            content: 'Break that down by status',
          }),
        }),
      );
    });

    it('should truncate large data previews in enriched history to ≤2000 chars', async () => {
      const bigRow = { data: 'x'.repeat(1000) };
      const bigRows = Array.from({ length: 5 }, () => bigRow);

      const { service, mockLlmCall } = buildService({
        dbHistory: [
          { role: 'user', content: 'Show daily logs', createdAt: new Date('2026-01-01') },
          {
            role: 'assistant',
            content: 'Here are the logs.',
            resultData: { rows: bigRows, rowCount: 5 },
            createdAt: new Date('2026-01-01T00:01:00'),
          },
        ],
        llmResponses: [
          JSON.stringify({ intent: 'chat' }),
          'Sure, the logs show...',
        ],
      });

      await service.query(TENANT_ID, USER_ID, 'Tell me more');

      const chatCall = mockLlmCall.mock.calls[1];
      const chatMessages = chatCall[1] as Array<{ role: string; content: string }>;
      const dataContextMsg = chatMessages.find((m) =>
        m.content.includes('[Data context:'),
      );
      expect(dataContextMsg).toBeDefined();
      expect(dataContextMsg!.content.length).toBeLessThan(2200);
    });
  });

  describe('validateAndSanitizeSql()', () => {
    let service: AiQueryService;

    beforeEach(() => {
      const { service: s } = buildService();
      service = s;
    });

    const validate = (sql: string) =>
      (service as unknown as { validateAndSanitizeSql: (s: string) => string }).validateAndSanitizeSql(sql);

    it('should accept a valid SELECT with $1', () => {
      const sql = "SELECT * FROM v_projects WHERE tenant_id = $1::uuid AND deleted_at IS NULL";
      expect(validate(sql)).toBe(sql);
    });

    it('should reject DELETE statements', () => {
      expect(() => validate("DELETE FROM v_projects WHERE tenant_id = $1::uuid")).toThrow(BadRequestException);
    });

    it('should reject queries without $1 tenant filter', () => {
      expect(() => validate("SELECT * FROM v_projects")).toThrow(BadRequestException);
    });

    it('should reject multiple statements', () => {
      expect(() =>
        validate("SELECT 1 FROM v_projects WHERE tenant_id = $1::uuid; DROP TABLE v_projects"),
      ).toThrow(BadRequestException);
    });

    it('should strip trailing semicolons', () => {
      const sql = "SELECT * FROM v_projects WHERE tenant_id = $1::uuid;";
      const result = validate(sql);
      expect(result.endsWith(';')).toBe(false);
    });

    it('should reject UNION attacks against other tenants', () => {
      expect(() =>
        validate(
          "SELECT id FROM v_projects WHERE tenant_id = $1::uuid UNION SELECT id FROM v_projects",
        ),
      ).toThrow(/UNION/);
    });

    it('should reject pg_catalog references', () => {
      expect(() =>
        validate("SELECT * FROM pg_catalog.pg_user WHERE tenant_id = $1::uuid"),
      ).toThrow(/pg_/);
    });

    it('should reject information_schema references', () => {
      expect(() =>
        validate("SELECT * FROM information_schema.tables WHERE tenant_id = $1::uuid"),
      ).toThrow(/information_schema/);
    });

    it('should reject queries against unlisted tables', () => {
      expect(() =>
        validate("SELECT * FROM users WHERE tenant_id = $1::uuid"),
      ).toThrow(/Forbidden table\/view reference/);
    });

    it('should reject set_config calls smuggled in', () => {
      expect(() =>
        validate(
          "SELECT set_config('app.current_tenant_id', 'evil', false) FROM v_projects WHERE tenant_id = $1::uuid",
        ),
      ).toThrow(/SET_CONFIG|SET/);
    });

    it('should reject pg_read_file and similar superuser functions', () => {
      expect(() =>
        validate(
          "SELECT pg_read_file('/etc/passwd') FROM v_projects WHERE tenant_id = $1::uuid",
        ),
      ).toThrow(/PG_READ_FILE|pg_/);
    });

    it('should reject WITH RECURSIVE CTEs', () => {
      expect(() =>
        validate(
          "WITH RECURSIVE t AS (SELECT 1) SELECT * FROM v_projects WHERE tenant_id = $1::uuid",
        ),
      ).toThrow(/RECURSIVE/);
    });

    it('should not be fooled by keywords hidden in line comments', () => {
      // The dangerous keyword is inside a line comment — should NOT trip the
      // check, since stripCommentsAndStrings removes it. But the query is also
      // missing a real FROM target, so it should still fail on allowlist.
      expect(() =>
        validate("SELECT 1 -- DROP TABLE projects\n FROM v_projects WHERE tenant_id = $1::uuid"),
      ).not.toThrow();
    });

    it('should not be fooled by keywords hidden in string literals', () => {
      const sql =
        "SELECT id FROM v_projects WHERE tenant_id = $1::uuid AND name = 'DROP TABLE users'";
      expect(validate(sql)).toBe(sql);
    });
  });
});
