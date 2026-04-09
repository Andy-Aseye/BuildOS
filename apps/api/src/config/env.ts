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

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WHATSAPP_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_ID: z.string().min(1).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),
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
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
