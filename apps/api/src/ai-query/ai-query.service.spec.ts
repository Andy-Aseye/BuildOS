import { BadRequestException } from '@nestjs/common';
import { AiQueryService } from './ai-query.service';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000002';

function buildService(overrides: {
  llmResponses?: string[];
  dbHistory?: Array<{ role: string; content: string; resultData?: unknown; createdAt: Date }>;
  queryResult?: unknown[];
} = {}) {
  const llmResponses = [...(overrides.llmResponses ?? [])];
  let llmCallIndex = 0;

  const mockPrisma = {
    aiChatMessage: {
      findMany: jest.fn().mockResolvedValue(overrides.dbHistory ?? []),
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue(overrides.queryResult ?? []),
  };

  const service = new AiQueryService(mockPrisma as never);

  const mockLlmCall = jest.fn().mockImplementation(async () => {
    const response = llmResponses[llmCallIndex] ?? '';
    llmCallIndex++;
    return response;
  });

  // Replace private llmCall with mock
  (service as unknown as Record<string, unknown>)['llmCall'] = mockLlmCall;

  return { service, mockPrisma, mockLlmCall };
}

describe('AiQueryService', () => {
  describe('query() — follow-up with data context', () => {
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
          // 1st call: intent classification → needs_sql
          JSON.stringify({ needs_sql: true, chat_message: '' }),
          // 2nd call: SQL generation
          "SELECT status, count(*) AS count FROM v_projects WHERE tenant_id = $1::uuid AND deleted_at IS NULL GROUP BY status",
          // 3rd call: answer generation
          'You have 3 active and 2 completed projects.',
        ],
        queryResult: previousRows,
      });

      const result = await service.query(TENANT_ID, USER_ID, 'Break that down by status');

      expect(result.answer).toBe('You have 3 active and 2 completed projects.');
      expect(result.rows).toEqual(previousRows);

      // The SQL generation call (2nd llmCall) should receive data context
      const sqlGenCall = mockLlmCall.mock.calls[1];
      const sqlGenMessages = sqlGenCall[1] as Array<{ role: string; content: string }>;
      const dataContextMsg = sqlGenMessages.find((m) =>
        m.content.includes('[Data context:'),
      );
      expect(dataContextMsg).toBeDefined();
      expect(dataContextMsg!.content).toContain('5 rows returned');

      // Verify the user message was persisted
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
          JSON.stringify({ needs_sql: false, chat_message: '' }),
          'Sure, the logs show...',
        ],
      });

      await service.query(TENANT_ID, USER_ID, 'Tell me more');

      // Chat reply call (2nd llmCall) should have a truncated data context
      const chatCall = mockLlmCall.mock.calls[1];
      const chatMessages = chatCall[1] as Array<{ role: string; content: string }>;
      const dataContextMsg = chatMessages.find((m) =>
        m.content.includes('[Data context:'),
      );
      expect(dataContextMsg).toBeDefined();
      // The raw JSON of 5 rows with 1000-char strings is ~5015 chars; must be truncated
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
  });
});
