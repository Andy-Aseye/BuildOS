import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';
import { env } from '../config/env';

@Injectable()
export class WhatsAppCloudService {
  private readonly logger = new Logger(WhatsAppCloudService.name);
  private readonly client: Twilio;

  constructor() {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured');
    }
    this.client = new Twilio(accountSid, authToken);
  }

  private normalizeWhatsappNumber(value: string): string {
    const digits = value.replace(/\D/g, '');
    return `whatsapp:${digits}`;
  }

  async sendTextMessage(toPhoneDigits: string, body: string): Promise<void> {
    const fromValue = env.TWILIO_WHATSAPP_FROM;
    if (!fromValue) throw new Error('TWILIO_WHATSAPP_FROM not configured');

    const to = this.normalizeWhatsappNumber(toPhoneDigits);
    const from = fromValue.startsWith('whatsapp:') ? fromValue : this.normalizeWhatsappNumber(fromValue);

    try {
      await this.client.messages.create({
        to,
        from,
        body: body.slice(0, 4096),
      });
    } catch (err) {
      this.logger.error('Send message failed', err as Error);
      throw err;
    }
  }

  async downloadMediaFromUrl(url: string): Promise<Buffer> {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured');
    }

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`downloadMedia: ${res.status} ${err}`);
      throw new Error(`Media download failed: ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
}
