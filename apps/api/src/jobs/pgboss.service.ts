import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import PgBoss = require('pg-boss');
import { env } from '../config/env';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss: PgBoss | null = null;

  async onModuleInit() {
    await this.startWithRetry(3, 3_000);
  }

  private async startWithRetry(maxAttempts: number, baseDelayMs: number) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const connectionString = env.DIRECT_URL;
        this.boss = new PgBoss({
          connectionString,
          ssl: { rejectUnauthorized: false },
          connectionOptions: { connectionTimeoutMillis: 15_000 },
        });
        await this.boss.start();
        this.logger.log('pg-boss started');
        return;
      } catch (err) {
        this.boss = null;
        if (attempt === maxAttempts) {
          this.logger.error(`pg-boss failed after ${maxAttempts} attempts — WhatsApp jobs disabled`, err);
          return;
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(`pg-boss attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  async onModuleDestroy() {
    if (this.boss) {
      await this.boss.stop({ graceful: true, timeout: 10_000 });
      this.logger.log('pg-boss stopped');
    }
  }

  getBoss(): PgBoss | null {
    return this.boss;
  }

  isReady(): boolean {
    return this.boss !== null;
  }
}
