import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { PgBossService } from '../jobs/pgboss.service';
import { QUEUE_WHATSAPP_INBOUND } from '../jobs/queue.constants';
import type { WhatsAppWebhookPayload } from './whatsapp.types';

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(private readonly pgBoss: PgBossService) {}

  verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    const secret = env.WHATSAPP_APP_SECRET;
    if (!secret) {
      // In production this is unreachable — the env zod refine throws on boot.
      // In dev/test we permit unsigned payloads so the local webhook tester works.
      if (env.NODE_ENV === 'production') {
        this.logger.error(
          'WHATSAPP_APP_SECRET not configured in production — rejecting webhook. This is a fatal misconfiguration.',
        );
        return false;
      }
      this.logger.warn(
        'WHATSAPP_APP_SECRET not set (dev/test only) — skipping signature verification. NEVER deploy without this set.',
      );
      return true;
    }
    if (!signatureHeader?.startsWith('sha256=')) return false;
    const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expected = Buffer.from(`sha256=${expectedHex}`, 'utf8');
    const received = Buffer.from(signatureHeader, 'utf8');
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  }

  async enqueue(payload: WhatsAppWebhookPayload): Promise<boolean> {
    const boss = this.pgBoss.getBoss();
    if (!boss) {
      this.logger.error('pg-boss not available — cannot enqueue WhatsApp job');
      return false;
    }
    const jobId = await boss.send(QUEUE_WHATSAPP_INBOUND, { payload });
    if (jobId === null) {
      this.logger.error(`pg-boss returned null for send() — queue "${QUEUE_WHATSAPP_INBOUND}" may not exist yet`);
      return false;
    }
    this.logger.log(`Job enqueued: id=${jobId} queue=${QUEUE_WHATSAPP_INBOUND}`);
    return true;
  }
}
