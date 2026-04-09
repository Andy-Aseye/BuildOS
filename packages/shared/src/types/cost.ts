export enum CostCategory {
  MATERIALS = 'MATERIALS',
  LABOUR = 'LABOUR',
  EQUIPMENT = 'EQUIPMENT',
  SUBCONTRACTORS = 'SUBCONTRACTORS',
  TRANSPORT = 'TRANSPORT',
  MISCELLANEOUS = 'MISCELLANEOUS',
}

export enum CostSource {
  WHATSAPP_AI = 'WHATSAPP_AI',
  MANUAL = 'MANUAL',
}

export enum CostStatus {
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export enum Currency {
  GHS = 'GHS',
  USD = 'USD',
}

export interface CostEntry {
  id: string;
  projectId: string;
  tenantId: string;
  source: CostSource;
  status: CostStatus;
  description: string;
  category: CostCategory;
  currency: Currency;
  amount: number;
  fxRateAtEntry: number | null;
  loggedById: string;
  confirmedById: string | null;
  confirmedAt: string | null;
  rawMessageId: string | null;
  entryDate: string;
  createdAt: string;
}

export interface BudgetSummary {
  totalBudgetGhs: number | null;
  totalBudgetUsd: number | null;
  totalSpentGhs: number;
  totalSpentUsd: number;
  percentConsumed: number;
  byCategory: Record<CostCategory, { ghs: number; usd: number }>;
}
