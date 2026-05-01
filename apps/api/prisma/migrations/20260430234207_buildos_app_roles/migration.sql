-- B2 — Non-bypassing application roles for tenant-isolated runtime queries.
--
-- Today the app connects via the Supabase service_role / postgres superuser, both of
-- which carry BYPASSRLS. That makes the RLS policies in 20250404000001_enable_rls
-- functionally inert: a missing `where: { tenantId }` in any handler leaks data.
--
-- This migration introduces two purpose-built roles that DO honour RLS:
--   • buildos_app          — read/write app role for handler-driven traffic
--   • buildos_app_readonly — read-only role for AI Query NL→SQL output (B4)
--
-- Operators must:
--   1. Set the password on each role (one-time, after this migration applies).
--   2. Switch DATABASE_URL to use buildos_app (and BUILDOS_AIQUERY_DATABASE_URL to
--      use buildos_app_readonly). Keep service_role only for Supabase Storage
--      and supabase.auth.admin.* operations.
--
-- After flipping DATABASE_URL, any forgotten tenantId filter returns zero rows
-- instead of cross-tenant rows. Combined with the B1 PrismaService.forTenant()
-- extension, every query carries `set_config('app.current_tenant_id', …, TRUE)`.
--
-- Idempotent: safe to re-run via `prisma migrate deploy`.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buildos_app') THEN
    CREATE ROLE buildos_app LOGIN NOINHERIT;
    -- Password must be set by operator: ALTER ROLE buildos_app WITH PASSWORD '...';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buildos_app_readonly') THEN
    CREATE ROLE buildos_app_readonly LOGIN NOINHERIT;
  END IF;
END
$$;

-- Hard guarantee these roles cannot bypass RLS.
ALTER ROLE buildos_app NOBYPASSRLS;
ALTER ROLE buildos_app_readonly NOBYPASSRLS;

-- Allow each role to use the public schema. They still need explicit grants
-- on individual tables/views below.
GRANT USAGE ON SCHEMA public TO buildos_app;
GRANT USAGE ON SCHEMA public TO buildos_app_readonly;

-- ── App role: full DML on every existing table ──────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO buildos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO buildos_app;

-- And on all FUTURE tables/sequences (caught by Prisma migrations going forward).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO buildos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO buildos_app;

-- ── Read-only role: SELECT on the curated v_* views only ────────────────────
-- Strict allowlist — buildos_app_readonly cannot read raw tables, only the views,
-- which already prefilter by tenantId once RLS sees app.current_tenant_id.
-- The list mirrors 20260418120000_add_ai_query_views.
GRANT SELECT ON TABLE
  v_projects,
  v_users,
  v_cost_entries,
  v_rfis,
  v_daily_logs,
  v_daily_log_photos,
  v_attendance_logs,
  v_materials_requests,
  v_materials_request_items,
  v_delay_logs,
  v_progress_reports,
  v_drawing_reviews,
  v_drawing_revisions,
  v_project_phases,
  v_project_members,
  v_project_budget_alert_state,
  v_project_files,
  v_invites,
  v_notifications,
  v_audit_logs
TO buildos_app_readonly;

-- The views are SECURITY INVOKER by default — they execute under the calling
-- role's privileges, so RLS still applies. Explicitly enforce SECURITY INVOKER
-- on each view to make this contract obvious to future maintainers.
ALTER VIEW v_projects                    SET (security_invoker = true);
ALTER VIEW v_users                       SET (security_invoker = true);
ALTER VIEW v_cost_entries                SET (security_invoker = true);
ALTER VIEW v_rfis                        SET (security_invoker = true);
ALTER VIEW v_daily_logs                  SET (security_invoker = true);
ALTER VIEW v_daily_log_photos            SET (security_invoker = true);
ALTER VIEW v_attendance_logs             SET (security_invoker = true);
ALTER VIEW v_materials_requests          SET (security_invoker = true);
ALTER VIEW v_materials_request_items     SET (security_invoker = true);
ALTER VIEW v_delay_logs                  SET (security_invoker = true);
ALTER VIEW v_progress_reports            SET (security_invoker = true);
ALTER VIEW v_drawing_reviews             SET (security_invoker = true);
ALTER VIEW v_drawing_revisions           SET (security_invoker = true);
ALTER VIEW v_project_phases              SET (security_invoker = true);
ALTER VIEW v_project_members             SET (security_invoker = true);
ALTER VIEW v_project_budget_alert_state  SET (security_invoker = true);
ALTER VIEW v_project_files               SET (security_invoker = true);
ALTER VIEW v_invites                     SET (security_invoker = true);
ALTER VIEW v_notifications               SET (security_invoker = true);
ALTER VIEW v_audit_logs                  SET (security_invoker = true);

-- ── Defence-in-depth: explicitly deny direct table reads to the readonly role ──
-- (REVOKE from PUBLIC isn't enough because views inherit table grants. We rely
-- on the role only having SELECT on v_* views, never on raw tables.)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM buildos_app_readonly;
GRANT SELECT ON TABLE
  v_projects,
  v_users,
  v_cost_entries,
  v_rfis,
  v_daily_logs,
  v_daily_log_photos,
  v_attendance_logs,
  v_materials_requests,
  v_materials_request_items,
  v_delay_logs,
  v_progress_reports,
  v_drawing_reviews,
  v_drawing_revisions,
  v_project_phases,
  v_project_members,
  v_project_budget_alert_state,
  v_project_files,
  v_invites,
  v_notifications,
  v_audit_logs
TO buildos_app_readonly;

-- Allow each role to read app.current_tenant_id (set by the Prisma extension).
-- Both roles need this so RLS policies evaluate correctly.
-- (No grant needed — set_config / current_setting are SECURITY DEFINER built-ins.)
