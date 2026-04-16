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
    this.logger.warn(`Webhook verify FAILED — mode=${mode}, receivedToken=${token}, configuredToken=${env.WHATSAPP_VERIFY_TOKEN ?? 'NOT SET'}`);
    return res.status(403).send();
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw?.length) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }
    if (!this.webhook.verifySignature(raw, signature)) {
      throw new ForbiddenException('Invalid signature');
    }
    const body = req.body as WhatsAppWebhookPayload;
    const ok = await this.webhook.enqueue(body);
    if (!ok) {
      throw new BadRequestException('Queue unavailable');
    }
    return { received: true };
  }
}
