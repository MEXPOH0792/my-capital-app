export { ALLOCATION_MODES, distributeIncome, getAllocationTotal } from './finance/allocation.js';
export type { DistributedIncome } from './finance/allocation.js';
export type { AllocationModeDefinition } from './types.js';
export { getCategoryPresets, getActiveCategoryPresets, aggregateTransactionsByCategory } from './finance/categories.js';
export type { ActiveCategoryPresetsArgs, AggregatedCategory } from './finance/categories.js';
export { getDebtStrategies } from './finance/debts.js';
export type { DebtStrategies, DebtRecommendationType } from './finance/debts.js';
export {
  getPeriodSummary,
  getGoalPace,
  getMetricDelta,
  getBiggestExpenseRise,
  getMonthlySeries,
  getMonthlyTrend,
  aggregateExpensesByAccount,
  buildReportText,
} from './finance/reports.js';
export type {
  PeriodSummary,
  SavingsTone,
  GoalPace,
  MetricDelta,
  DeltaDirection,
  CategoryMovement,
  MonthBucket,
  MonthlyTrend,
  TrendKind,
  SpendingRow,
  ReportTextBlock,
} from './finance/reports.js';
export { getGoalJourney } from './finance/goals.js';
export type { GoalJourney } from './finance/goals.js';
export { getAdvisorInsight } from './finance/advisor.js';
export type { AdvisorInsight, AdvisorTone, AdvisorArgs } from './finance/advisor.js';
export { getMonthlySpendByCategory, getLimitProgress, getLimitStatus, forecastLimit } from './finance/limits.js';
export type { CategoryLimit, LimitStatus, LimitProgress, LimitForecast } from './finance/limits.js';
