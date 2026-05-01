import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(__dirname, '../../.env'),
];

const envPath = envCandidates.find((p) => existsSync(p));
if (envPath) {
  loadEnv({ path: envPath, override: true });
}

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    /**
     * Read-only DATABASE_URL used by the AI Query NL→SQL pipeline (B4).
     * Should connect as the buildos_app_readonly role from the B2 migration.
     * If unset, AI Query falls back to DATABASE_URL with extra parser hardening
     * — works in dev, but production ops should supply a separate URL.
     */
    BUILDOS_AIQUERY_DATABASE_URL: z.string().min(1).optional(),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
    WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),
    /**
     * HMAC secret used to verify Meta-signed webhook payloads.
     * Required in production — without it, anyone who knows the URL can inject WhatsApp events.
     */
    WHATSAPP_APP_SECRET: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(1).optional(),
    /** Supabase Storage bucket for inbound WhatsApp media (create in dashboard). */
    WHATSAPP_MEDIA_BUCKET: z.string().min(1).optional(),
    /** Bucket for dashboard uploads (drawings, progress report PDFs). Falls back to WHATSAPP_MEDIA_BUCKET. */
    PROJECT_STORAGE_BUCKET: z.string().min(1).optional(),
    /** Resend API key for transactional email. */
    RESEND_API_KEY: z.string().min(1).optional(),
    /** From address for transactional emails. */
    EMAIL_FROM: z.string().optional(),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== 'production') return;

    // WhatsApp signature verification is mandatory ONLY when WhatsApp is
    // actively wired up in production. If none of the WhatsApp send/receive
    // env vars are set, the integration is dormant: the runtime webhook
    // handler in whatsapp-webhook.service.ts already rejects every unsigned
    // payload in production, so there is no exposure to gate at boot time.
    //
    // The moment any WhatsApp var is set (access token, phone id, verify
    // token), this check re-engages and refuses to start without APP_SECRET
    // — that is the dangerous state we still need to prevent.
    const whatsappConfigured =
      cfg.WHATSAPP_ACCESS_TOKEN || cfg.WHATSAPP_PHONE_NUMBER_ID || cfg.WHATSAPP_VERIFY_TOKEN;

    if (whatsappConfigured && !cfg.WHATSAPP_APP_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_APP_SECRET'],
        message:
          'WHATSAPP_APP_SECRET is required when any other WHATSAPP_* var is set in production. ' +
          'The webhook would otherwise reject all inbound messages.',
      });
    }

    if (!cfg.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RESEND_API_KEY'],
        message:
          'RESEND_API_KEY is required in production — onboarding/invite/report emails will silently fail without it.',
      });
    }

    if (!cfg.EMAIL_FROM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EMAIL_FROM'],
        message: 'EMAIL_FROM is required in production (e.g. "BuildOS <noreply@yourdomain.com>").',
      });
    }
  });

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
