export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PhaseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  AT_RISK = 'AT_RISK',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED',
}

export interface Project {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  clientName: string;
  description: string | null;
  status: ProjectStatus;
  budgetGhs: number | null;
  budgetUsd: number | null;
  fxRateGhsUsd: number | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  order: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  percentComplete: number;
  status: PhaseStatus;
  notes: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
}
