ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delay_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
  FOR ALL USING ("id" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON users
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON projects
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON cost_entries
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON daily_logs
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON attendance_logs
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON whatsapp_messages
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON project_files
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON progress_reports
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON drawing_reviews
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON rfis
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON materials_requests
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON delay_logs
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON audit_logs
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members."projectId"
        AND p."tenantId" = current_setting('app.current_tenant_id', true)::uuid
    )
  );

CREATE POLICY tenant_isolation ON project_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_phases."projectId"
        AND p."tenantId" = current_setting('app.current_tenant_id', true)::uuid
    )
  );

CREATE POLICY tenant_isolation ON daily_log_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM daily_logs d
      WHERE d.id = daily_log_photos."dailyLogId"
        AND d."tenantId" = current_setting('app.current_tenant_id', true)::uuid
    )
  );

CREATE POLICY tenant_isolation ON drawing_revisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM drawing_reviews dr
      WHERE dr.id = drawing_revisions."drawingReviewId"
        AND dr."tenantId" = current_setting('app.current_tenant_id', true)::uuid
    )
  );

CREATE POLICY tenant_isolation ON materials_request_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM materials_requests mr
      WHERE mr.id = materials_request_items."materialsRequestId"
        AND mr."tenantId" = current_setting('app.current_tenant_id', true)::uuid
    )
  );
