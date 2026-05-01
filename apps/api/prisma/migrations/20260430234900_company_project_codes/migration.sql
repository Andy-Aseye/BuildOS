-- Package C: Per-tenant company codes + atomic project code generation.
-- Strategy:
--   1. Create the companyCode/nextProjectSeq columns and the GlobalCounter table.
--   2. Backfill companyCode for every existing tenant in createdAt order using a
--      pure-SQL implementation of the seqToCode helper (see code-sequence.ts).
--   3. Re-issue project.code per tenant in createdAt order so legacy "ABC-01"
--      style codes are replaced with "${companyCode}${seqToCode(n)}" — e.g.
--      "A1A1", "A1A2", ...
--   4. Set nextProjectSeq to the per-tenant project count and seed the global
--      counter with the total tenant count, so future allocations continue
--      monotonically without ever colliding with backfilled values.
--
-- IMPORTANT: existing project codes are overwritten. Frontend dashboards must
-- refresh after migration. If the pilot is mid-flight, owners should be
-- informed of the new codes (a one-shot email script can iterate `tenants`
-- and `projects` to send per-tenant code lists).

-- ──────────────────────────────────────────────────────────────────────────────
-- 1) Schema changes
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE "tenants"
  ADD COLUMN "companyCode" TEXT,
  ADD COLUMN "nextProjectSeq" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "global_counters" (
  "key"   TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "global_counters_pkey" PRIMARY KEY ("key")
);

INSERT INTO "global_counters" ("key", "value") VALUES ('company', 0);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2) Helper: seqToCode in pure SQL (mirror of apps/api/src/common/code-sequence.ts)
--
--    1..2600       → A1..Z100
--    2601..70200   → AA1..ZZ100
--    70201..1827800→ AAA1..ZZZ100
--    ...etc.
--
--    The function is created with SECURITY DEFINER off (default INVOKER) so
--    NOBYPASSRLS roles can still invoke it for ad-hoc reissuance scripts. We
--    drop it at the end of the migration to keep the schema surface clean.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.seq_to_code(seq INTEGER) RETURNS TEXT AS $$
DECLARE
  remaining     INTEGER := seq - 1;
  prefix_len    INTEGER := 1;
  block_size    INTEGER := 26 * 100;  -- single-letter block holds 2,600 codes
  letter_idx    INTEGER;
  numeric_part  INTEGER;
  letters       TEXT := '';
  idx           INTEGER;
  i             INTEGER;
BEGIN
  IF seq IS NULL OR seq < 1 THEN
    RAISE EXCEPTION 'seq_to_code: expected positive integer, got %', seq;
  END IF;

  WHILE remaining >= block_size LOOP
    remaining   := remaining - block_size;
    prefix_len  := prefix_len + 1;
    block_size  := POWER(26, prefix_len)::INTEGER * 100;
  END LOOP;

  letter_idx   := remaining / 100;
  numeric_part := (remaining % 100) + 1;

  idx := letter_idx;
  FOR i IN 1..prefix_len LOOP
    letters := CHR(65 + (idx % 26)) || letters;
    idx := idx / 26;
  END LOOP;

  RETURN letters || numeric_part::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3) Backfill companyCode for existing tenants in deterministic createdAt order.
--    Use ROW_NUMBER() so the assignment is reproducible: the oldest tenant
--    becomes A1, the next A2, and so on.
-- ──────────────────────────────────────────────────────────────────────────────
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "tenants"
)
UPDATE "tenants" t
SET "companyCode" = pg_temp.seq_to_code(o.rn::INTEGER)
FROM ordered o
WHERE o.id = t.id;

-- Now make companyCode NOT NULL and unique. Any new rows after this point
-- must come through auth.service.register() which allocates atomically.
ALTER TABLE "tenants" ALTER COLUMN "companyCode" SET NOT NULL;
CREATE UNIQUE INDEX "tenants_companyCode_key" ON "tenants"("companyCode");

-- Seed the global counter with the count of existing tenants so the next
-- registration emits a code strictly greater than any backfilled value.
UPDATE "global_counters"
SET "value" = (SELECT COUNT(*) FROM "tenants")
WHERE "key" = 'company';

-- ──────────────────────────────────────────────────────────────────────────────
-- 4) Re-issue project codes per tenant.
--    Existing code values like "ABC-01" are replaced with the new scheme.
--    Each tenant's projects are re-numbered in createdAt order: oldest gets
--    `${companyCode}A1`, next `${companyCode}A2`, etc.
-- ──────────────────────────────────────────────────────────────────────────────
WITH ordered AS (
  SELECT
    p.id,
    p."tenantId",
    t."companyCode",
    ROW_NUMBER() OVER (PARTITION BY p."tenantId" ORDER BY p."createdAt", p.id) AS rn
  FROM "projects" p
  INNER JOIN "tenants" t ON t.id = p."tenantId"
)
UPDATE "projects" p
SET "code" = o."companyCode" || pg_temp.seq_to_code(o.rn::INTEGER)
FROM ordered o
WHERE o.id = p.id;

-- Set nextProjectSeq to the count of projects per tenant. Future
-- ProjectsService.create() does `increment: 1` then reads, so the next
-- allocation lands at count + 1 — exactly one past the highest backfilled rn.
UPDATE "tenants" t
SET "nextProjectSeq" = COALESCE((
  SELECT COUNT(*) FROM "projects" p WHERE p."tenantId" = t.id
), 0);

-- Note: pg_temp.seq_to_code is a session-scoped temp function and is dropped
-- automatically when the migration's psql/Prisma connection closes. Future
-- code allocations are done in application code via seqToCode() in
-- apps/api/src/common/code-sequence.ts. No leftover schema surface.
