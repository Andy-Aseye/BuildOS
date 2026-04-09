import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import PgBoss = require('pg-boss');
import { env } from '../config/env';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss: PgBoss | null = null;

  async onModuleInit() {
    try {
      const connectionString = env.DIRECT_URL;
      this.boss = new PgBoss({ connectionString, ssl: true });
      await this.boss.start();
      this.logger.log('pg-boss started');
    } catch (err) {
      this.logger.error('pg-boss failed to start — WhatsApp jobs disabled', err);
      this.boss = null;
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
