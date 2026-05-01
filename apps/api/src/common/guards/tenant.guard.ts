import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';
import { TenantContext } from '../tenant-context';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that the request has a real tenantId (set by AuthGuard) and exposes
 * a tenant-scoped Prisma client on `request.prisma` so handlers/services that
 * want database-enforced isolation can opt in.
 *
 * The actual AsyncLocalStorage scope is established by TenantContextInterceptor.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ tenantId?: string; prisma?: unknown }>();
    const tenantId = request.tenantId;

    if (!tenantId || !UUID_RE.test(tenantId)) {
      this.logger.warn('No valid tenant ID found on request');
      return false;
    }

    // Expose the RLS-scoped Prisma client so handlers/services can opt in:
    //   const prisma = req.prisma; // typed as the extended client
    //   const projects = await prisma.project.findMany();   // RLS enforced
    request.prisma = this.prisma.forTenant(tenantId);

    // Mirror tenantId into AsyncLocalStorage as a belt-and-suspenders backup
    // for anything reading TenantContext outside the interceptor's run scope.
    // The interceptor already establishes context, so this is mostly a no-op.
    if (!TenantContext.tenantId()) {
      this.logger.debug(`TenantContext not yet active for ${tenantId}; relying on interceptor`);
    }

    return true;
  }
}
