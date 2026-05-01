import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request tenant identity, propagated via AsyncLocalStorage so it survives
 * across `await` boundaries without needing to thread it through every function arg.
 *
 * Stored by the auth interceptor (AsyncTenantContextInterceptor) as soon as the
 * AuthGuard resolves the tenant from the JWT, then read by:
 *   - PrismaService.forTenant() RLS extension (B1)
 *   - withTenantWhere() Prisma middleware (B3)
 *
 * Outside an HTTP request (workers, cron jobs, scripts) the store is undefined.
 */
export type TenantContextStore = {
  tenantId: string;
  userId?: string;
  /**
   * If set to true by an explicit caller, B3 middleware skips the "must include
   * tenantId in where" check. Reserved for system operations like the WhatsApp
   * processor (which looks up users by phone before tenant context exists)
   * and the auth flows. NEVER set this for handler-driven code paths.
   */
  bypass?: boolean;
};

const storage = new AsyncLocalStorage<TenantContextStore>();

export const TenantContext = {
  /** Run `fn` with the given tenant context active. Returns the function's result. */
  run<T>(store: TenantContextStore, fn: () => T): T {
    return storage.run(store, fn);
  },

  /** Returns the current tenant context, or undefined if outside any request scope. */
  current(): TenantContextStore | undefined {
    return storage.getStore();
  },

  /** Convenience: returns the active tenantId or undefined. */
  tenantId(): string | undefined {
    return storage.getStore()?.tenantId;
  },

  /**
   * Run `fn` with B3's tenant-where check disabled. Use sparingly, only for
   * code paths that legitimately operate across tenants (auth, webhooks).
   */
  bypass<T>(fn: () => T): T {
    const current = storage.getStore();
    return storage.run({ ...(current ?? { tenantId: '' }), bypass: true }, fn);
  },
};
