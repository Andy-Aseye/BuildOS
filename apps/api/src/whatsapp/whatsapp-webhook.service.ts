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
      this.logger.warn('WHATSAPP_APP_SECRET not set — skipping signature verification (dev only)');
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
    await boss.send(QUEUE_WHATSAPP_INBOUND, { payload });
    return true;
  }
}
