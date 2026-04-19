-- Read-only PostgreSQL views with snake_case column aliases for AI query generation.
-- These are zero-cost query rewrites (not materialized) — same execution plan as the underlying tables.

-- ── projects ──────────────────────────────────────────────
CREATE OR REPLACE VIEW v_projects AS
SELECT
  id,
  "tenantId"        AS tenant_id,
  code,
  name,
  "clientName"      AS client_name,
  description,
  status,
  "budgetGhs"       AS budget_ghs,
  "budgetUsd"       AS budget_usd,
  "fxRateGhsUsd"    AS fx_rate_ghs_usd,
  "startDate"       AS start_date,
  "expectedEndDate" AS expected_end_date,
  "actualEndDate"   AS actual_end_date,
  "createdAt"       AS created_at,
  "updatedAt"       AS updated_at,
  "deletedAt"       AS deleted_at
FROM "projects";

-- ── users ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_users AS
SELECT
  id,
  "tenantId"      AS tenant_id,
  email,
  "whatsappPhone" AS whatsapp_phone,
  name,
  role,
  "isActive"      AS is_active,
  "lastActiveAt"  AS last_active_at,
  "createdAt"     AS created_at,
  "updatedAt"     AS updated_at,
  "deletedAt"     AS deleted_at
FROM "users";

-- ── cost_entries ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_cost_entries AS
SELECT
  id,
  "projectId"       AS project_id,
  "tenantId"        AS tenant_id,
  source,
  status,
  description,
  category,
  currency,
  amount,
  "fxRateAtEntry"   AS fx_rate_at_entry,
  "loggedById"      AS logged_by_id,
  "confirmedById"   AS confirmed_by_id,
  "confirmedAt"     AS confirmed_at,
  "rejectionReason" AS rejection_reason,
  "rawMessageId"    AS raw_message_id,
  "entryDate"       AS entry_date,
  "createdAt"       AS created_at,
  "updatedAt"       AS updated_at,
  "deletedAt"       AS deleted_at
FROM "cost_entries";

-- ── rfis ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_rfis AS
SELECT
  id,
  "projectId"       AS project_id,
  "tenantId"        AS tenant_id,
  "referenceNo"     AS reference_no,
  title,
  description,
  "linkedDrawingId" AS linked_drawing_id,
  status,
  "raisedById"      AS raised_by_id,
  "assignedToId"    AS assigned_to_id,
  "dueDate"         AS due_date,
  response,
  "respondedAt"     AS responded_at,
  "closedAt"        AS closed_at,
  "rawMessageId"    AS raw_message_id,
  "createdAt"       AS created_at,
  "updatedAt"       AS updated_at
FROM "rfis";

-- ── daily_logs ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_daily_logs AS
SELECT
  id,
  "projectId"     AS project_id,
  "tenantId"      AS tenant_id,
  "logDate"       AS log_date,
  "submittedById" AS submitted_by_id,
  "rawContent"    AS raw_content,
  "aiSummary"     AS ai_summary,
  activities,
  materials,
  incidents,
  weather,
  source,
  "rawMessageId"  AS raw_message_id,
  "createdAt"     AS created_at
FROM "daily_logs";

-- ── daily_log_photos ──────────────────────────────────────
CREATE OR REPLACE VIEW v_daily_log_photos AS
SELECT
  id,
  "dailyLogId"  AS daily_log_id,
  "storageUrl"  AS storage_url,
  caption,
  "takenAt"     AS taken_at,
  "createdAt"   AS created_at
FROM "daily_log_photos";

-- ── attendance_logs ───────────────────────────────────────
CREATE OR REPLACE VIEW v_attendance_logs AS
SELECT
  id,
  "projectId"    AS project_id,
  "tenantId"     AS tenant_id,
  "logDate"      AS log_date,
  "workerCount"  AS worker_count,
  "reportedById" AS reported_by_id,
  "rawMessageId" AS raw_message_id,
  "confirmedAt"  AS confirmed_at,
  "createdAt"    AS created_at
FROM "attendance_logs";

-- ── materials_requests ────────────────────────────────────
CREATE OR REPLACE VIEW v_materials_requests AS
SELECT
  id,
  "projectId"             AS project_id,
  "tenantId"              AS tenant_id,
  "requestedById"         AS requested_by_id,
  status,
  "estimatedTotal"        AS estimated_total,
  currency,
  notes,
  "requiresOwnerApproval" AS requires_owner_approval,
  "approvedById"          AS approved_by_id,
  "approvedAt"            AS approved_at,
  "rejectionReason"       AS rejection_reason,
  "costEntryId"           AS cost_entry_id,
  "createdAt"             AS created_at,
  "updatedAt"             AS updated_at
FROM "materials_requests";

-- ── materials_request_items ───────────────────────────────
CREATE OR REPLACE VIEW v_materials_request_items AS
SELECT
  id,
  "materialsRequestId" AS materials_request_id,
  description,
  quantity,
  unit,
  "estimatedUnitCost"  AS estimated_unit_cost,
  "deliveredQuantity"  AS delivered_quantity,
  "deliveredAt"        AS delivered_at
FROM "materials_request_items";

-- ── delay_logs ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_delay_logs AS
SELECT
  id,
  "projectId"         AS project_id,
  "tenantId"          AS tenant_id,
  "delayDate"         AS delay_date,
  "durationHours"     AS duration_hours,
  cause,
  description,
  "reportedById"      AS reported_by_id,
  "reviewedByPM"      AS reviewed_by_pm,
  "causeOverrideNote" AS cause_override_note,
  "rawMessageId"      AS raw_message_id,
  "linkedRFIId"       AS linked_rfi_id,
  "createdAt"         AS created_at,
  "updatedAt"         AS updated_at
FROM "delay_logs";

-- ── progress_reports ──────────────────────────────────────
CREATE OR REPLACE VIEW v_progress_reports AS
SELECT
  id,
  "projectId"        AS project_id,
  "tenantId"         AS tenant_id,
  "periodStart"      AS period_start,
  "periodEnd"        AS period_end,
  "generatedAt"      AS generated_at,
  "generatedById"    AS generated_by_id,
  "narrativeSummary" AS narrative_summary,
  "storageUrl"       AS storage_url,
  "sentToEmail"      AS sent_to_email,
  "sentAt"           AS sent_at
FROM "progress_reports";

-- ── drawing_reviews ───────────────────────────────────────
CREATE OR REPLACE VIEW v_drawing_reviews AS
SELECT
  id,
  "projectId"     AS project_id,
  "tenantId"      AS tenant_id,
  title,
  description,
  status,
  "submittedById" AS submitted_by_id,
  "reviewerId"    AS reviewer_id,
  "createdAt"     AS created_at,
  "updatedAt"     AS updated_at
FROM "drawing_reviews";

-- ── drawing_revisions ─────────────────────────────────────
CREATE OR REPLACE VIEW v_drawing_revisions AS
SELECT
  id,
  "drawingReviewId" AS drawing_review_id,
  "revisionNumber"  AS revision_number,
  "storageUrl"      AS storage_url,
  "fileSize"        AS file_size,
  "mimeType"        AS mime_type,
  "uploadedById"    AS uploaded_by_id,
  comments,
  "reviewedAt"      AS reviewed_at,
  "reviewedById"    AS reviewed_by_id,
  "createdAt"       AS created_at
FROM "drawing_revisions";

-- ── project_phases ────────────────────────────────────────
CREATE OR REPLACE VIEW v_project_phases AS
SELECT
  id,
  "projectId"       AS project_id,
  name,
  "order"           AS phase_order,
  "plannedStart"    AS planned_start,
  "plannedEnd"      AS planned_end,
  "actualStart"     AS actual_start,
  "actualEnd"       AS actual_end,
  "percentComplete" AS percent_complete,
  status,
  notes,
  "createdAt"       AS created_at,
  "updatedAt"       AS updated_at
FROM "project_phases";

-- ── project_members ───────────────────────────────────────
CREATE OR REPLACE VIEW v_project_members AS
SELECT
  id,
  "projectId" AS project_id,
  "userId"    AS user_id,
  role,
  "joinedAt"  AS joined_at,
  "leftAt"    AS left_at
FROM "project_members";

-- ── project_budget_alert_state ────────────────────────────
CREATE OR REPLACE VIEW v_project_budget_alert_state AS
SELECT
  id,
  "projectId"    AS project_id,
  "tenantId"     AS tenant_id,
  "lastGhsLevel" AS last_ghs_level,
  "lastUsdLevel" AS last_usd_level,
  "createdAt"    AS created_at,
  "updatedAt"    AS updated_at
FROM "project_budget_alert_state";

-- ── project_files ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_project_files AS
SELECT
  id,
  "projectId"    AS project_id,
  "tenantId"     AS tenant_id,
  name,
  folder,
  "storageUrl"   AS storage_url,
  "fileSize"     AS file_size,
  "mimeType"     AS mime_type,
  "uploadedById" AS uploaded_by_id,
  "createdAt"    AS created_at,
  "deletedAt"    AS deleted_at
FROM "project_files";

-- ── invites ───────────────────────────────────────────────
CREATE OR REPLACE VIEW v_invites AS
SELECT
  id,
  "tenantId"    AS tenant_id,
  email,
  name,
  phone,
  role,
  "invitedById" AS invited_by_id,
  "expiresAt"   AS expires_at,
  "acceptedAt"  AS accepted_at,
  "createdAt"   AS created_at
FROM "invites";

-- ── notifications ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_notifications AS
SELECT
  id,
  "tenantId"  AS tenant_id,
  "userId"    AS user_id,
  type,
  title,
  body,
  link,
  read,
  "createdAt" AS created_at
FROM "notifications";

-- ── audit_logs ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_audit_logs AS
SELECT
  id,
  "tenantId"   AS tenant_id,
  "actorId"    AS actor_id,
  action,
  "entityType" AS entity_type,
  "entityId"   AS entity_id,
  "oldValues"  AS old_values,
  "newValues"  AS new_values,
  metadata,
  "createdAt"  AS created_at
FROM "audit_logs";
