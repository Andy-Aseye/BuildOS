import { Global, Module, OnModuleInit, OnModuleDestroy, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry(3, 2_000);
  }

  async onModuleDestroy() {
    await this.$disconnect();
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
