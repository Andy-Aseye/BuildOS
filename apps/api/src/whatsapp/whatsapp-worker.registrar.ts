import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PgBossService } from '../jobs/pgboss.service';
import { QUEUE_WHATSAPP_INBOUND } from '../jobs/queue.constants';
import { WhatsAppProcessorService } from './whatsapp-processor.service';
import type { WhatsAppInboundJobData } from './whatsapp.types';

@Injectable()
export class WhatsAppWorkerRegistrar implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppWorkerRegistrar.name);

  constructor(
    private readonly pgBoss: PgBossService,
    private readonly processor: WhatsAppProcessorService,
  ) {}

  async onModuleInit() {
    const boss = this.pgBoss.getBoss();
    if (!boss) {
      this.logger.warn('WhatsApp inbound worker not started (pg-boss unavailable)');
      return;
    }
    try {
      await boss.createQueue(QUEUE_WHATSAPP_INBOUND);
    } catch {
      /* queue may already exist */
    }
    await boss.work(QUEUE_WHATSAPP_INBOUND, async (jobs) => {
      this.logger.log(`Processing ${jobs.length} job(s) from ${QUEUE_WHATSAPP_INBOUND}`);
      for (const job of jobs) {
        try {
          const data = job.data as WhatsAppInboundJobData;
          await this.processor.processWebhookPayload(data.payload);
        } catch (e) {
          this.logger.error(`Unhandled error processing job ${job.id}`, e);
          throw e; // rethrow so pg-boss can retry
        }
      }
    });
    this.logger.log(`Worker registered: ${QUEUE_WHATSAPP_INBOUND}`);
  }
}
