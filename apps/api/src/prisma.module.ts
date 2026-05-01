import { Global, Module, OnModuleInit, OnModuleDestroy, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from './common/tenant-context';

/**
 * Models that the B3 defence-in-depth validator enforces, mapped to the set of
 * keys the `where` clause must contain at least one of.
 *
 * Why multiple keys? Many existing services scope by `projectId` after an
 * upfront `requireProject(projectId, tenantId)` check, which delivers the same
 * isolation as a direct `tenantId` filter. We accept either so the validator
 * doesn't break legitimate, well-isolated queries.
 *
 * If you add a tenant-scoped model to schema.prisma, add it here too.
 */
const TENANT_SCOPE_KEYS: Record<string, readonly string[]> = {
  Tenant: ['id'],
  User: ['tenantId', 'id'],
  Project: ['tenantId', 'id'],
  ProjectMember: ['projectId', 'userId', 'id'],
  ProjectPhase: ['projectId', 'id'],
  CostEntry: ['tenantId', 'projectId', 'id'],
  DailyLog: ['tenantId', 'projectId', 'id'],
  DailyLogPhoto: ['dailyLogId', 'id'],
  AttendanceLog: ['tenantId', 'projectId', 'id'],
  WhatsappMessage: ['tenantId', 'projectId', 'id'],
  ProjectFile: ['tenantId', 'projectId', 'id'],
  ProgressReport: ['tenantId', 'projectId', 'id'],
  DrawingReview: ['tenantId', 'projectId', 'id'],
  DrawingRevision: ['drawingReviewId', 'id'],
  RFI: ['tenantId', 'projectId', 'id'],
  MaterialsRequest: ['tenantId', 'projectId', 'id'],
  MaterialsRequestItem: ['materialsRequestId', 'id'],
  DelayLog: ['tenantId', 'projectId', 'id'],
  AuditLog: ['tenantId', 'id'],
  Notification: ['tenantId', 'userId', 'id'],
  Invite: ['tenantId', 'id'],
  ProjectBudgetAlertState: ['tenantId', 'projectId', 'id'],
  AiChatMessage: ['tenantId', 'userId', 'id'],
};

const ENFORCED_OPERATIONS = new Set<string>([
  'findMany',
  'updateMany',
  'deleteMany',
  'aggregate',
  'count',
  'groupBy',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry(3, 2_000);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns a Prisma client that enforces tenant isolation in two layers:
   *
   *   B1 (RLS) — every query is wrapped in a 2-statement batch transaction that
   *   first runs `set_config('app.current_tenant_id', <tenantId>, TRUE)`. The
   *   set_config is transaction-scoped so it auto-resets when the tx ends, and
   *   pgbouncer-safe because all statements run on the same pinned connection.
   *
   *   B3 (validator) — for tenant-scoped models, asserts the where clause
   *   includes at least one tenant-scoping key (tenantId, projectId, userId,
   *   etc., per TENANT_SCOPE_KEYS). Throws on violation. Use TenantContext
   *   .bypass(...) for legitimate cross-tenant code paths (auth, webhooks).
   *
   * Use this for handler-scoped reads/writes where you want the database itself
   * to enforce isolation in case an upstream `where: { tenantId }` is forgotten.
   * Pairs with the buildos_app role (B2) which has no BYPASSRLS.
   *
   * Latency: each query becomes a ~2-roundtrip batch tx. Acceptable for the pilot.
   */
  forTenant(tenantId: string) {
    if (!tenantId) {
      throw new Error('PrismaService.forTenant called without a tenantId');
    }
    const base = this;
    return base.$extends({
      name: `withTenant(${tenantId})`,
      query: {
        $allModels: {
          async $allOperations({ args, query, model, operation }) {
            // B3: validator — only enforce if we're inside a request scope and
            // the caller hasn't explicitly bypassed.
            const ctx = TenantContext.current();
            const enforce = ctx ? !ctx.bypass : false;
            if (enforce && model && ENFORCED_OPERATIONS.has(operation)) {
              const allowedKeys = TENANT_SCOPE_KEYS[model];
              if (allowedKeys) {
                const a = args as { where?: Record<string, unknown> } | undefined;
                const where = a?.where ?? {};
                const hasScopeKey = allowedKeys.some(
                  (k) => where[k] !== undefined && where[k] !== null,
                );
                if (!hasScopeKey) {
                  throw new Error(
                    `Tenant isolation guard: ${model}.${operation} called without one of [${allowedKeys.join(
                      ', ',
                    )}] in where clause. Add a tenant-scoping filter, or wrap the call in TenantContext.bypass(...) ` +
                      `if it legitimately operates across tenants.`,
                  );
                }
              }
            }

            // B1: RLS — pin the connection and apply set_config in a batch tx.
            const [, result] = await base.$transaction([
              base.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result as unknown;
          },
        },
      },
    });
  }

  private async connectWithRetry(maxAttempts: number, baseDelayMs: number) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          this.logger.error(`Database connection failed after ${maxAttempts} attempts`, err);
          throw err;
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(`Database connection attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
