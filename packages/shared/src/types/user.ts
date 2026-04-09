export enum UserRole {
  OWNER = 'OWNER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ARCHITECT = 'ARCHITECT',
  FOREMAN = 'FOREMAN',
  FIELD_WORKER = 'FIELD_WORKER',
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string | null;
  whatsappPhone: string | null;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  lastActiveAt: string | null;
}

export const DASHBOARD_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.PROJECT_MANAGER,
  UserRole.ARCHITECT,
];

export const FINANCIAL_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.PROJECT_MANAGER,
];

export const WHATSAPP_ONLY_ROLES: UserRole[] = [
  UserRole.FOREMAN,
  UserRole.FIELD_WORKER,
];
