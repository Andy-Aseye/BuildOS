import { Injectable, Logger } from '@nestjs/common';
import OpenAI, { toFile } from 'openai';
import { z } from 'zod';
import { env } from '../config/env';
import { CostCategory, Currency } from '@prisma/client';

const COST_CATEGORY_SET = new Set<string>([
  CostCategory.MATERIALS,
  CostCategory.LABOUR,
  CostCategory.EQUIPMENT,
  CostCategory.SUBCONTRACTORS,
  CostCategory.TRANSPORT,
  CostCategory.MISCELLANEOUS,
]);

const ClassificationSchema = z.object({
  intent: z.enum([
    'site_update',
    'cost_entry',
    'attendance',
    'material_delivery',
    'incident',
    'question',
    'unclassified',
  ]),
  summary: z.string().optional(),
  amount: z.number().optional(),
  currency: z.enum(['GHS', 'USD']).optional(),
  category: z
    .enum([
      'MATERIALS',
      'LABOUR',
      'EQUIPMENT',
      'SUBCONTRACTORS',
      'TRANSPORT',
      'MISCELLANEOUS',
    ])
    .optional(),
  workerCount: z.number().int().positive().optional(),
});

export type Classification = z.infer<typeof ClassificationSchema>;

@Injectable()
export class WhatsAppOpenAiService {
  private readonly logger = new Logger(WhatsAppOpenAiService.name);

  private client(): OpenAI | null {
    const key = env.OPENAI_API_KEY;
    if (!key) return null;
    return new OpenAI({ apiKey: key });
  }

  async transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
    const openai = this.client();
    if (!openai) {
      this.logger.warn('OPENAI_API_KEY missing — skipping transcription');
      return '';
    }
    try {
      const file = await toFile(buffer, filename);
      const r = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      return r.text ?? '';
    } catch (e) {
      this.logger.error('Whisper transcription failed', e);
      return '';
    }
  }

  async classify(text: string): Promise<Classification> {
    const openai = this.client();
    if (!openai) {
      return { intent: 'unclassified' };
    }

    const system = `You classify construction site WhatsApp messages for BuildOS (Ghana/West Africa).
Return JSON only with keys: intent, summary (optional), amount (optional number), currency (GHS|USD optional), category (MATERIALS|LABOUR|EQUIPMENT|SUBCONTRACTORS|TRANSPORT|MISCELLANEOUS optional), workerCount (optional positive integer for headcount).
intent must be one of: site_update, cost_entry, attendance, material_delivery, incident, question, unclassified.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text.slice(0, 12_000) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) return { intent: 'unclassified' };
      const parsed = JSON.parse(raw) as unknown;
      const out = ClassificationSchema.safeParse(parsed);
      if (!out.success) {
        this.logger.warn(`Classification parse fallback: ${out.error.message}`);
        return { intent: 'unclassified' };
      }
      return out.data;
    } catch (e) {
      this.logger.error('GPT classification failed', e);
      return { intent: 'unclassified' };
    }
  }

  mapCategory(c?: string): CostCategory {
    if (!c) return CostCategory.MISCELLANEOUS;
    const u = c.toUpperCase();
    return COST_CATEGORY_SET.has(u) ? (u as CostCategory) : CostCategory.MISCELLANEOUS;
  }

  mapCurrency(c?: string): Currency {
    return c === 'USD' ? Currency.USD : Currency.GHS;
  }
}
