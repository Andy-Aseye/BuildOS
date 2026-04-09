import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      this.logger.warn('No tenant ID found on request');
      return false;
    }

    await this.prisma.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', '${tenantId}', true)`,
    );

    return true;
  }
}
