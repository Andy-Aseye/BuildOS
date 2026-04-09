-- CreateTable
CREATE TABLE "project_budget_alert_state" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "lastGhsLevel" INTEGER NOT NULL DEFAULT 0,
    "lastUsdLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_budget_alert_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_budget_alert_state_projectId_key" ON "project_budget_alert_state"("projectId");

-- AddForeignKey
ALTER TABLE "project_budget_alert_state" ADD CONSTRAINT "project_budget_alert_state_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE project_budget_alert_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON project_budget_alert_state
  FOR ALL USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid);
