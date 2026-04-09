import { CostCategory, DelayCause } from '../types';

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  [CostCategory.MATERIALS]: 'Materials',
  [CostCategory.LABOUR]: 'Labour',
  [CostCategory.EQUIPMENT]: 'Equipment',
  [CostCategory.SUBCONTRACTORS]: 'Subcontractors',
  [CostCategory.TRANSPORT]: 'Transport',
  [CostCategory.MISCELLANEOUS]: 'Miscellaneous',
};

export const DELAY_CAUSE_LABELS: Record<DelayCause, string> = {
  [DelayCause.WEATHER]: 'Weather',
  [DelayCause.MATERIALS]: 'Materials',
  [DelayCause.LABOUR]: 'Labour',
  [DelayCause.DESIGN]: 'Design',
  [DelayCause.CLIENT]: 'Client',
  [DelayCause.UTILITIES]: 'Utilities',
  [DelayCause.OTHER]: 'Other',
};

export const DELAY_CAUSE_RESPONSIBILITY: Record<DelayCause, string> = {
  [DelayCause.WEATHER]: 'Neutral',
  [DelayCause.MATERIALS]: 'Contractor',
  [DelayCause.LABOUR]: 'Contractor',
  [DelayCause.DESIGN]: 'Architect / Client',
  [DelayCause.CLIENT]: 'Client',
  [DelayCause.UTILITIES]: 'Neutral',
  [DelayCause.OTHER]: 'TBD',
};

export const BUDGET_ALERT_THRESHOLDS = {
  WARNING: 0.75,
  CRITICAL: 0.90,
} as const;

export const DEFAULT_APPROVAL_THRESHOLD_GHS = 2000;

export const ACTIVITY_STALENESS = {
  AMBER_DAYS: 2,
  RED_DAYS: 5,
} as const;
