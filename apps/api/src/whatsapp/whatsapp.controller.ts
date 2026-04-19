import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import type { WhatsAppWebhookPayload } from './whatsapp.types';

@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly webhook: WhatsAppWebhookService) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ) {
    this.logger.log(`Webhook verify attempt: mode=${mode}, tokenMatch=${token === env.WHATSAPP_VERIFY_TOKEN}, hasChallenge=${!!challenge}`);
    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
      this.logger.log('Webhook verification successful');
      return res.status(200).type('text/plain').send(challenge);
    }
    this.logger.warn(`Webhook verify FAILED — mode=${mode}, tokenMatch=false, configured=${env.WHATSAPP_VERIFY_TOKEN ? 'YES' : 'NOT SET'}`);
    return res.status(403).send();
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ) {
    // ⚑ Log FIRST — before any validation — so every Meta POST is visible in Render logs
    this.logger.log(
      `WhatsApp POST webhook hit — has-signature=${!!signature}, rawBody-length=${req.rawBody?.length ?? 'null'}`,
    );

    const raw = req.rawBody;
    if (!raw?.length) {
      this.logger.error(
        'rawBody is missing or empty. Ensure NestFactory is created with { rawBody: true } ' +
        'and no middleware is consuming the body stream before NestJS body-parser runs.',
      );
      throw new BadRequestException('Missing raw body for webhook verification');
    }
    if (!this.webhook.verifySignature(raw, signature)) {
      this.logger.warn('Webhook signature verification failed — rejecting request');
      throw new ForbiddenException('Invalid signature');
    }
    const body = req.body as WhatsAppWebhookPayload;
    this.logger.log(`Inbound webhook accepted — object=${body?.object ?? 'unknown'}, entries=${body?.entry?.length ?? 0}`);
    const ok = await this.webhook.enqueue(body);
    if (!ok) {
      this.logger.error('Failed to enqueue webhook — pg-boss unavailable');
      throw new BadRequestException('Queue unavailable');
    }
    this.logger.log('Webhook enqueued successfully');
    return { received: true };
  }
}
