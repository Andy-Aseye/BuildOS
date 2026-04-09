# BuildOS — AI Agent Context File
> Place this file at the repo root. Claude Code reads it automatically at the start of every session.
> Full technical specification: `docs/BuildOS_Technical_Plan.md`

---

## What This Project Is

BuildOS is a **multi-tenant construction project management SaaS** for Ghanaian/West African construction firms.

**Core mechanic:** Field workers send messages to a single WhatsApp Business number. AI classifies them, extracts structured data, and populates a web dashboard. No app download for field workers. No behaviour change. The value appears automatically.

**First client:** Building Ideas Limited, Accra, Ghana (13+ active projects).

**Built by:** Rubicx Technologies Ltd.

---

## Tech Stack — Quick Reference

| Layer | Technology |
|---|---|
| Monorepo | Turborepo |
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| Job queue | pg-boss (PostgreSQL-backed, no Redis) |
| WhatsApp | Meta Cloud API (direct, no Twilio) |
| Voice transcription | OpenAI Whisper |
| AI classification | GPT-4o with Zod structured outputs |
| PDF generation | @react-pdf/renderer (server-side) |
| File storage | Supabase Storage |
| Frontend hosting | Vercel |
| API hosting | Railway |
| Font | Geist + Geist Mono (via `next/font`, zero config) |
| Design reference | Defcon PM Dashboard (Figma) |

---

## Monorepo Structure

```
buildos/
├── apps/
│   ├── web/                        # Next.js 15 dashboard
│   │   ├── app/
│   │   │   ├── (auth)/             # login, register
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx      # sidebar + header shell
│   │   │       ├── page.tsx        # portfolio view
│   │   │       └── projects/[id]/
│   │   │           ├── page.tsx    # project overview
│   │   │           ├── diary/
│   │   │           ├── costs/
│   │   │           ├── photos/
│   │   │           ├── team/
│   │   │           ├── files/
│   │   │           ├── timeline/
│   │   │           ├── drawings/
│   │   │           ├── rfis/
│   │   │           ├── materials/
│   │   │           ├── delays/
│   │   │           └── reports/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components (owned, not installed)
│   │   │   ├── dashboard/          # portfolio, project card, alert strip
│   │   │   ├── project/            # diary, cost table, photo gallery, etc.
│   │   │   └── shared/             # buttons, forms, modals
│   │   └── lib/
│   │       ├── api-client.ts       # TanStack Query wrappers
│   │       └── utils.ts
│   │
│   └── api/                        # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── auth/
│       │   ├── tenants/
│       │   ├── projects/
│       │   ├── costs/
│       │   ├── diary/
│       │   ├── attendance/
│       │   ├── files/
│       │   ├── reports/
│       │   ├── drawings/
│       │   ├── rfis/
│       │   ├── materials/
│       │   ├── delays/
│       │   ├── whatsapp/           # webhook controller + job processor
│       │   ├── ai/                 # OpenAI wrapper + prompts
│       │   ├── jobs/               # pg-boss setup
│       │   ├── storage/            # Supabase Storage wrapper
│       │   └── common/
│       │       ├── guards/         # AuthGuard, TenantGuard
│       │       ├── decorators/     # @CurrentUser(), @CurrentTenant()
│       │       ├── filters/        # GlobalExceptionFilter
│       │       └── interceptors/
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
└── packages/
    └── shared/
        ├── types/                  # shared TypeScript interfaces
        └── constants/
```

---

## Database — Model Summary

All models have: `id` (UUID), `tenantId` (UUID), `createdAt`, `updatedAt`. Financial models also have `deletedAt` (soft delete — never hard DELETE).

| Model | Purpose |
|---|---|
| `Tenant` | One per company. All data scoped to tenant. |
| `User` | Dashboard users (email) and field workers (whatsappPhone). Roles below. |
| `Project` | Core entity. Has `code` (e.g. `BIL-07`) for WhatsApp routing. |
| `ProjectMember` | Junction: User ↔ Project with role |
| `ProjectPhase` | Timeline phases, manually updated by PM |
| `CostEntry` | Financial entries — AI-created (PENDING) or manual. PM confirms. |
| `DailyLog` | Structured site diary entry, sourced from WhatsApp messages |
| `DailyLogPhoto` | Photos linked to a DailyLog |
| `AttendanceLog` | Daily headcount per project, reported by Foreman |
| `WhatsappMessage` | Raw log of every inbound/outbound message (idempotency via `whatsappMsgId`) |
| `ProjectFile` | Any uploaded file, organised into folders (DRAWINGS/CONTRACTS/PERMITS/etc.) |
| `ProgressReport` | Generated PDF reports, stored in Supabase Storage |
| `DrawingReview` | Drawing lifecycle: DRAFT→SUBMITTED→UNDER_REVIEW→REVISION_REQUIRED→RESUBMITTED→APPROVED |
| `DrawingRevision` | Each revision upload, immutable once submitted |
| `RFI` | Request for Information — formal clarification with due date tracking |
| `MaterialsRequest` | PM-initiated materials request with approval threshold logic |
| `MaterialsRequestItem` | Line items on a MaterialsRequest |
| `DelayLog` | Site delays with cause category (WEATHER/MATERIALS/LABOUR/DESIGN/CLIENT/UTILITIES) |
| `AuditLog` | Append-only. Records every financial change. Never delete rows from this table. |

Full schema is in `prisma/schema.prisma`.

---

## User Roles (RBAC)

```typescript
enum UserRole {
  OWNER           // MD/CEO — sees everything including all financial data
  PROJECT_MANAGER // manages projects, handles procurement/materials
  ARCHITECT       // manages drawings and RFIs
  FOREMAN         // site supervisor — WhatsApp only (daily logs, attendance, deliveries)
  FIELD_WORKER    // general worker — WhatsApp only, no dashboard access
}
```

**Critical financial access rules:**
- `OWNER` — sees all cost totals, all budgets, approves materials requests above threshold
- `PROJECT_MANAGER` — sees cost details on assigned projects only, approves below threshold
- `ARCHITECT` — sees no financial data at all
- `FOREMAN` / `FIELD_WORKER` — no dashboard access, WhatsApp only

Enforce at two layers: NestJS Guard (check JWT role) AND Supabase RLS policy (database-level). If the guard has a bug, the DB refuses the query.

---

## Multi-Tenancy — RLS Pattern

Every table has a `tenant_id` column. Set per request in NestJS middleware:

```sql
SELECT set_config('app.current_tenant_id', $1, true);
```

RLS policy on every table:
```sql
CREATE POLICY tenant_isolation ON <table>
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Never** query without `tenantId` in scope. The `TenantGuard` middleware handles this — wrap every authenticated route with it.

---

## Critical Code Patterns

### 1. WhatsApp Webhook — Always Return 200 Immediately

```typescript
@Post()
@HttpCode(200)
async receiveMessage(@Headers('x-hub-signature-256') sig: string, @Body() payload, @RawBody() raw: Buffer) {
  this.whatsappService.validateSignature(raw, sig); // 403 if invalid
  await this.jobQueue.add('process-whatsapp-message', payload);
  return { received: true }; // NEVER await AI processing here
}
```

Meta retries on non-200. AI processing must always be async via pg-boss.

### 2. GPT-4o — Always Use Structured Outputs with Zod

```typescript
const result = await openai.beta.chat.completions.parse({
  model: 'gpt-4o',
  messages: [...],
  response_format: zodResponseFormat(MessageClassificationSchema, 'classification'),
});
const parsed = result.choices[0].message.parsed; // fully typed, no string parsing
```

Never parse free-form text from AI responses. Always use `zodResponseFormat`.

### 3. Whisper — Prime with Domain Vocabulary

```typescript
await openai.audio.transcriptions.create({
  file,
  model: 'whisper-1',
  language: 'en',
  prompt: 'Construction site report from Ghana. Materials: cement, rods, sand, gravel. Costs in Ghana cedis (GHS).',
});
```

The `prompt` parameter primes Whisper on domain vocabulary — improves accuracy significantly for construction terms and Ghanaian proper nouns.

### 4. Supabase — Two Connection Strings

```bash
DATABASE_URL=  # port 6543, ?pgbouncer=true  → use for all Prisma queries
DIRECT_URL=    # port 5432, no pgbouncer     → use ONLY for migrations
```

In `schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 5. Soft Deletes — Never Hard DELETE

```typescript
// WRONG
await prisma.costEntry.delete({ where: { id } });

// CORRECT
await prisma.costEntry.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

All queries must filter `where: { deletedAt: null }` or use a Prisma middleware that adds this automatically.

### 6. Env Validation — Crash on Start if Missing

```typescript
// apps/api/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env); // throws on startup if invalid
```

---

## WhatsApp Message Routing Logic

```
Incoming from phone X
  → Unknown sender → reply with registration prompt, stop
  → Known sender, 1 active project → route to that project
  → Known sender, multiple projects:
      → Message starts with #CODE → route to that project
      → No code → check last active project → use it
      → No history → ask "Reply with project code"
  → Enqueue job → return 200 → process async
```

Project codes are 6 chars max, human-readable, unique per tenant (e.g. `BIL-07`).

---

## Design Tokens (globals.css)

```css
:root {
  --sidebar-bg:      #0b1120;  /* Deep Navy */
  --sidebar-accent:  #1e293b;  /* Slate-800 — active nav bg */
  --content-bg:      #f1f5f9;  /* Slate-100 */
  --card-bg:         #ffffff;
  --border:          #e2e8f0;  /* Slate-200 */
  --primary:         #1d4ed8;  /* Deep Blue-700 */
  --primary-subtle:  #dbeafe;  /* Blue-100 */
  --status-green:    #10b981;  /* Emerald-500 */
  --status-amber:    #f59e0b;
  --status-red:      #ef4444;
  --text-primary:    #0f172a;
  --text-secondary:  #475569;
  --text-muted:      #94a3b8;
}
```

Font: **Rubik** (sans) — loaded in `app/layout.tsx` via `next/font/google`.
Sidebar: 240px fixed, collapses to 64px icon-only on tablet.
Design reference: [Defcon PM Dashboard (Figma)](https://www.figma.com/community/file/1433409812186983586)

---

## What NOT to Do

- **No Redis** — pg-boss handles the job queue. Don't add Redis.
- **No hard DELETEs** — always soft delete with `deletedAt`.
- **No string parsing of AI output** — always use `zodResponseFormat`.
- **No `await` in the WhatsApp webhook handler** — always enqueue first, return 200.
- **No financial data to ARCHITECT / FOREMAN / FIELD_WORKER** — enforce at guard AND DB layer.
- **No GraphQL** — REST only. TanStack Query handles REST cleanly.
- **No microservices** — monolith until the pain of monolith is real.
- **No Docker** — use Railway for API, Vercel for frontend. No containers in early stage.
- **No per-user billing logic** — billing is per tenant (company), not per user.
- **No `console.log` in production paths** — use NestJS Logger or Sentry.

---

## Environment Variables

```bash
DATABASE_URL=          # Supabase pooled (port 6543, pgbouncer=true)
DIRECT_URL=            # Supabase direct (port 5432, migrations only)
SUPABASE_URL=
SUPABASE_ANON_KEY=     # public, safe for frontend
SUPABASE_SERVICE_ROLE_KEY=  # secret, backend only
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
OPENAI_API_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
NODE_ENV=
API_URL=
FRONTEND_URL=
JWT_SECRET=
SENTRY_DSN=
```

---

## Reference

Full technical plan (features, Prisma schema, API endpoints, roadmap): `docs/BuildOS_Technical_Plan.md`
