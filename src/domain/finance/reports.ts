// Period-level report maths.
//
// All amounts are in minor units (kopecks). Functions here are pure so the
// analytics screen stays a thin rendering layer and every rule below can be
// pinned by a unit test.

export type SavingsTone = 'negative' | 'thin' | 'working' | 'strong';

export interface PeriodSummary {
  income: number;
  expenses: number;
  /** Income minus tracked expenses. Negative means the period ran at a loss. */
  saved: number;
  /** Share of income kept, rounded to whole percent. null when there was no income. */
  savingsRate: number | null;
  tone: SavingsTone | null;
}

const toSafeAmount = (value: number): number => {
  const amount = Math.round(Number(value) || 0);
  return amount > 0 ? amount : 0;
};

/**
 * The reserve for required expenses is money set aside, not money spent, so
 * callers pass expenses that already exclude it — the same figure the report
 * shows as "tracked expenses".
 */
export const getPeriodSummary = (income: number, expenses: number): PeriodSummary => {
  const safeIncome = toSafeAmount(income);
  const safeExpenses = toSafeAmount(expenses);
  const saved = safeIncome - safeExpenses;

  if (safeIncome === 0) {
    return { income: safeIncome, expenses: safeExpenses, saved, savingsRate: null, tone: null };
  }

  const savingsRate = Math.round((saved / safeIncome) * 100);
  const tone: SavingsTone =
    saved < 0 ? 'negative' : savingsRate < 10 ? 'thin' : savingsRate < 20 ? 'working' : 'strong';

  return { income: safeIncome, expenses: safeExpenses, saved, savingsRate, tone };
};

export interface GoalPace {
  /** Saving rate normalised to 30 days. Zero or negative when nothing is kept. */
  monthlySaving: number;
  /** Months to reach the capital goal at this pace, or null when not forecastable. */
  monthsToGoal: number | null;
}

// Past this horizon a forecast stops being information and starts being noise.
const MAX_FORECAST_MONTHS = 600;

export const getGoalPace = (saved: number, periodDays: number, remainingToTarget: number): GoalPace => {
  const days = Math.round(Number(periodDays) || 0);
  if (days <= 0) return { monthlySaving: 0, monthsToGoal: null };

  const monthlySaving = Math.round(((Number(saved) || 0) / days) * 30);
  if (monthlySaving <= 0 || remainingToTarget <= 0) return { monthlySaving, monthsToGoal: null };

  const monthsToGoal = Math.ceil(remainingToTarget / monthlySaving);
  return { monthlySaving, monthsToGoal: monthsToGoal > MAX_FORECAST_MONTHS ? null : monthsToGoal };
};

export type DeltaDirection = 'up' | 'down' | 'flat' | 'new' | 'none';

export interface MetricDelta {
  current: number;
  previous: number;
  absolute: number;
  /** Change against the previous period. null when there is no base to divide by. */
  percent: number | null;
  direction: DeltaDirection;
}

/**
 * Compares one figure against the same figure in the previous window.
 *
 * A zero base is not an infinite rise: "nothing before, something now" is
 * reported as `new` with no percentage, so the UI never prints +Infinity% or
 * a made-up +100%.
 */
export const getMetricDelta = (current: number, previous: number): MetricDelta => {
  const safeCurrent = Math.round(Number(current) || 0);
  const safePrevious = Math.round(Number(previous) || 0);
  const absolute = safeCurrent - safePrevious;

  if (safePrevious === 0) {
    return {
      current: safeCurrent,
      previous: safePrevious,
      absolute,
      percent: null,
      direction: safeCurrent === 0 ? 'none' : 'new',
    };
  }

  const percent = Math.round((absolute / Math.abs(safePrevious)) * 100);
  const direction: DeltaDirection = percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat';

  return { current: safeCurrent, previous: safePrevious, absolute, percent, direction };
};

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface CategoryMovement extends MetricDelta {
  category: string;
}

/**
 * The category that grew the most in absolute money since the previous period.
 * Absolute growth, not percentage: a category that went from 10 to 30 is noise
 * next to one that went from 20000 to 30000.
 */
export const getBiggestExpenseRise = (
  current: CategoryAmount[],
  previous: CategoryAmount[],
): CategoryMovement | null => {
  const previousByCategory = new Map<string, number>();
  (Array.isArray(previous) ? previous : []).forEach((item) => {
    if (!item?.category) return;
    previousByCategory.set(item.category, (previousByCategory.get(item.category) ?? 0) + Number(item.amount ?? 0));
  });

  let winner: CategoryMovement | null = null;

  (Array.isArray(current) ? current : []).forEach((item) => {
    if (!item?.category) return;
    const delta = getMetricDelta(Number(item.amount ?? 0), previousByCategory.get(item.category) ?? 0);
    if (delta.absolute <= 0) return;
    if (!winner || delta.absolute > winner.absolute) {
      winner = { ...delta, category: item.category };
    }
  });

  return winner;
};

export interface DatedAmount {
  date: string;
  amount: number;
}

export interface MonthBucket {
  /** YYYY-MM */
  key: string;
  year: number;
  /** 0-11, as returned by Date#getMonth */
  month: number;
  income: number;
  expenses: number;
}

const toMonthKey = (year: number, month: number): string => `${year}-${String(month + 1).padStart(2, '0')}`;

/**
 * A continuous run of months ending with the month of `nowMs`.
 *
 * Months with no activity are kept as zero buckets instead of being skipped —
 * dropping them would compress the timeline and make a trend look steadier
 * than it is. `nowMs` is an argument so the function stays pure and testable.
 */
export const getMonthlySeries = (
  income: DatedAmount[],
  expenses: DatedAmount[],
  monthCount: number,
  nowMs: number,
): MonthBucket[] => {
  const months = Math.max(1, Math.round(Number(monthCount) || 0));
  const now = new Date(nowMs);
  const buckets = new Map<string, MonthBucket>();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const point = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = toMonthKey(point.getFullYear(), point.getMonth());
    buckets.set(key, { key, year: point.getFullYear(), month: point.getMonth(), income: 0, expenses: 0 });
  }

  const collect = (items: DatedAmount[], field: 'income' | 'expenses') => {
    (Array.isArray(items) ? items : []).forEach((item) => {
      const point = new Date(item?.date);
      if (Number.isNaN(point.getTime())) return;
      const bucket = buckets.get(toMonthKey(point.getFullYear(), point.getMonth()));
      if (!bucket) return; // outside the displayed window
      bucket[field] += Number(item.amount) || 0;
    });
  };

  collect(income, 'income');
  collect(expenses, 'expenses');

  return [...buckets.values()];
};

export type TrendKind =
  | 'expenses-rising'
  | 'expenses-falling'
  | 'income-rising'
  | 'income-falling'
  | 'stable'
  | 'insufficient';

export interface MonthlyTrend {
  kind: TrendKind;
  /** Consecutive month-over-month moves; the run covers `streak + 1` months. */
  streak: number;
}

const countStreak = (values: number[], rising: boolean): number => {
  let streak = 0;
  for (let index = values.length - 1; index > 0; index -= 1) {
    const moved = rising ? values[index] > values[index - 1] : values[index] < values[index - 1];
    if (!moved) break;
    streak += 1;
  }
  return streak;
};

/**
 * One verdict about the series, ordered by how much it should worry the user:
 * a rising spending run outranks anything else, because that is the trend they
 * can act on today.
 */
export const getMonthlyTrend = (series: MonthBucket[]): MonthlyTrend => {
  const buckets = Array.isArray(series) ? series : [];
  const active = buckets.filter((bucket) => bucket.income > 0 || bucket.expenses > 0);
  if (buckets.length < 3 || active.length < 2) return { kind: 'insufficient', streak: 0 };

  const expenses = buckets.map((bucket) => bucket.expenses);
  const income = buckets.map((bucket) => bucket.income);

  const checks: { kind: TrendKind; streak: number }[] = [
    { kind: 'expenses-rising', streak: countStreak(expenses, true) },
    { kind: 'expenses-falling', streak: countStreak(expenses, false) },
    { kind: 'income-rising', streak: countStreak(income, true) },
    { kind: 'income-falling', streak: countStreak(income, false) },
  ];

  const hit = checks.find((check) => check.streak >= 2);
  return hit ?? { kind: 'stable', streak: 0 };
};

export interface SpendingRow {
  /** Row label. Named `category` so the breakdown UI renders every mode identically. */
  category: string;
  amount: number;
}

interface ExpenseWithAccount {
  amount?: number;
  meta?: { accountName?: unknown } | null;
}

/**
 * Spending grouped by the account it left, answering "which card is leaking".
 *
 * Callers pass expense transactions only, so transfers between the user's own
 * accounts never appear here — moving money is not spending.
 */
export const aggregateExpensesByAccount = (expenses: ExpenseWithAccount[], fallbackLabel: string): SpendingRow[] => {
  const grouped = new Map<string, number>();

  (Array.isArray(expenses) ? expenses : []).forEach((item) => {
    const name = String(item?.meta?.accountName ?? '').trim() || fallbackLabel;
    grouped.set(name, (grouped.get(name) ?? 0) + (Number(item?.amount) || 0));
  });

  return [...grouped.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
};

export interface ReportTextRow {
  label: string;
  value: string;
}

export interface ReportTextBlock {
  heading: string;
  rows: ReportTextRow[];
}

/**
 * Plain-text report for sharing or pasting into a chat.
 *
 * Blocks without rows are dropped rather than printed as a bare heading, so a
 * period with no income or no categorised spending still produces a clean note
 * instead of a skeleton with empty sections.
 */
export const buildReportText = (title: string, blocks: ReportTextBlock[]): string => {
  const parts: string[] = [title];

  (Array.isArray(blocks) ? blocks : []).forEach((block) => {
    const rows = (Array.isArray(block?.rows) ? block.rows : []).filter((row) => row && row.label);
    if (rows.length === 0) return;

    parts.push('', block.heading);
    rows.forEach((row) => parts.push(`${row.label}: ${row.value}`));
  });

  return parts.join('\n');
};
