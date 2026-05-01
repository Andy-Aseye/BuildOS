import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../tenant-context';

/**
 * Wraps every authenticated request handler in an AsyncLocalStorage scope so
 * downstream services (Prisma middleware, tenant-scoped clients, etc.) can read
 * the active tenant without having to thread it through method signatures.
 *
 * Reads `request.tenantId` and `request.user.id` (set by AuthGuard). If no
 * tenant is on the request — e.g. /auth/register, /webhooks — we run with no
 * context, which lets B3's middleware skip enforcement.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> | Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<{ tenantId?: string; user?: { id?: string } }>();
    const tenantId = req?.tenantId;
    if (!tenantId) {
      return next.handle();
    }
    return new Observable<unknown>((subscriber) => {
      TenantContext.run({ tenantId, userId: req.user?.id }, () => {
        const sub = next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
        return () => sub.unsubscribe();
      });
    });
  }
}
