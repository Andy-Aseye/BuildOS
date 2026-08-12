import { Injectable, Logger } from '@nestjs/common';
import { validateRequest } from 'twilio';
import { env } from '../config/env';
import { PgBossService } from '../jobs/pgboss.service';
import { QUEUE_WHATSAPP_INBOUND } from '../jobs/queue.constants';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import type { WhatsAppWebhookPayload } from './whatsapp.types';

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(private readonly pgBoss: PgBossService) {}

  verifySignature(req: RawBodyRequest<Request>): boolean {
    const authToken = env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      if (env.NODE_ENV === 'production') {
        this.logger.error(
          'TWILIO_AUTH_TOKEN not configured in production — rejecting webhook. This is a fatal misconfiguration.',
        );
        return false;
      }
      this.logger.warn(
        'TWILIO_AUTH_TOKEN not set (dev/test only) — skipping Twilio webhook verification. NEVER deploy without this set.',
      );
      return true;
    }

    const signatureHeader = req.headers['x-twilio-signature'];
    if (!signatureHeader || Array.isArray(signatureHeader)) {
      this.logger.warn('Missing x-twilio-signature header');
      return false;
    }

    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const params =
      req.body && typeof req.body === 'object' && Object.keys(req.body).length
        ? (req.body as Record<string, string>)
        : Object.fromEntries(new URLSearchParams(rawBody).entries());

    const protocol = (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    const host = req.get('host') ?? '';
    const url = `${protocol}://${host}${req.originalUrl}`;

    try {
      return validateRequest(authToken, signatureHeader, url, params);
    } catch (err) {
      this.logger.error('Twilio signature validation failed', err as Error);
      return false;
    }
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
