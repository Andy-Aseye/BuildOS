import {
  BadRequestException,
  Controller,
  ForbiddenException,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import type { WhatsAppWebhookPayload } from './whatsapp.types';

@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly webhook: WhatsAppWebhookService) {}

  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>) {
    const signatureHeader = req.headers['x-twilio-signature'];
    this.logger.log(
      `WhatsApp POST webhook hit — x-twilio-signature=${!!signatureHeader}, rawBody-length=${req.rawBody?.length ?? 'null'}`,
    );

    const raw = req.rawBody;
    if (!raw?.length) {
      this.logger.error(
        'rawBody is missing or empty. Ensure NestFactory is created with { rawBody: true } ' +
          'and no middleware is consuming the body stream before NestJS body-parser runs.',
      );
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    if (!this.webhook.verifySignature(req)) {
      this.logger.warn('Webhook signature verification failed — rejecting request');
      throw new ForbiddenException('Invalid signature');
    }

    const body =
      req.body && typeof req.body === 'object' && Object.keys(req.body).length
        ? (req.body as WhatsAppWebhookPayload)
        : Object.fromEntries(new URLSearchParams(raw.toString('utf8')).entries());

    this.logger.log(`Inbound webhook accepted — from=${body.From ?? 'unknown'}, numMedia=${body.NumMedia ?? '0'}`);
    const ok = await this.webhook.enqueue(body);
    if (!ok) {
      this.logger.error('Failed to enqueue webhook — pg-boss unavailable');
      throw new BadRequestException('Queue unavailable');
    }

    this.logger.log('Webhook enqueued successfully');
    return { received: true };
  }
}
