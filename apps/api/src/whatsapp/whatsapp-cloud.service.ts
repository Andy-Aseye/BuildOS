import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env';

@Injectable()
export class WhatsAppCloudService {
  private readonly logger = new Logger(WhatsAppCloudService.name);
  private readonly base = `https://graph.facebook.com/v21.0`;

  private headers(): HeadersInit {
    const token = env.WHATSAPP_TOKEN;
    if (!token) throw new Error('WHATSAPP_TOKEN not configured');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(toPhoneDigits: string, body: string): Promise<void> {
    const phoneId = env.WHATSAPP_PHONE_ID;
    if (!phoneId) throw new Error('WHATSAPP_PHONE_ID not configured');

    const to = toPhoneDigits.replace(/\D/g, '');
    const url = `${this.base}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: body.slice(0, 4096) },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Send message failed: ${res.status} ${err}`);
      throw new Error(`WhatsApp send failed: ${res.status}`);
    }
  }

  /** Resolve media id to a temporary download URL (requires Bearer). */
  async getMediaUrl(mediaId: string): Promise<{ url: string; mime_type?: string }> {
    const res = await fetch(`${this.base}/${mediaId}`, { headers: this.headers() });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`getMediaUrl ${mediaId}: ${res.status} ${err}`);
      throw new Error(`Media metadata failed: ${res.status}`);
    }
    return res.json() as Promise<{ url: string; mime_type?: string }>;
  }

  async downloadMediaFromUrl(url: string): Promise<Buffer> {
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`downloadMedia: ${res.status} ${err}`);
      throw new Error(`Media download failed: ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
}
