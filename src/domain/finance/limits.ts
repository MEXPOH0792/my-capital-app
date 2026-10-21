// Monthly spending limits per category.
//
// Amounts are in minor units. Limits run on the calendar month: it is the unit
// people already budget in, and it needs no extra configuration.

export interface CategoryLimit {
  id: string;
  category: string;
  /** Monthly ceiling in minor units. */
  amount: number;
}

export type LimitStatus = 'ok' | 'warning' | 'exceeded';

/** Share of the limit at which the app starts warning rather than reassuring. */
const WARNING_THRESHOLD = 80;

export const getLimitStatus = (percent: number): LimitStatus =>
  percent >= 100 ? 'exceeded' : percent >= WARNING_THRESHOLD ? 'warning' : 'ok';

interface DatedExpense {
  date?: string;
  category?: string;
  amount?: number;
}

/**
 * Spending per category inside the calendar month of `nowMs`.
 *
 * Callers pass expenses that already exclude the reserve for required bills —
 * money set aside is not money spent, and counting it would eat limits that
 * the user never actually spent against.
 */
export const getMonthlySpendByCategory = (expenses: DatedExpense[], nowMs: number): Record<string, number> => {
  const now = new Date(nowMs);
  const year = now.getFullYear();
  const month = now.getMonth();
  const spend: Record<string, number> = {};

  (Array.isArray(expenses) ? expenses : []).forEach((item) => {
    const date = new Date(item?.date ?? '');
    if (Number.isNaN(date.getTime())) return;
    if (date.getFullYear() !== year || date.getMonth() !== month) return;

    const category = String(item?.category ?? '').trim();
    if (!category) return;
    spend[category] = (spend[category] ?? 0) + (Number(item?.amount) || 0);
  });

  return spend;
};

export interface LimitProgress {
  id: string;
  category: string;
  limit: number;
  spent: number;
  /** Negative once the limit is blown. */
  remaining: number;
  percent: number;
  status: LimitStatus;
}

/**
 * Progress for every configured limit, worst first — the categories in trouble
 * are the ones worth showing at the top.
 */
export const getLimitProgress = (limits: CategoryLimit[], spendByCategory: Record<string, number>): LimitProgress[] =>
  (Array.isArray(limits) ? limits : [])
    .filter((item) => item && item.category && Number(item.amount) > 0)
    .map((item) => {
      const limit = Math.round(Number(item.amount));
      const spent = Math.round(Number(spendByCategory?.[item.category]) || 0);
      const percent = Math.round((spent / limit) * 100);

      return {
        id: item.id,
        category: item.category,
        limit,
        spent,
        remaining: limit - spent,
        percent,
        status: getLimitStatus(percent),
      };
    })
    .sort((a, b) => b.percent - a.percent || a.category.localeCompare(b.category));

export interface LimitForecast {
  limit: number;
  spent: number;
  /** What the month's total becomes if this expense is recorded. */
  projected: number;
  /** Money left after it; negative means the limit is blown. */
  remaining: number;
  status: LimitStatus;
}

/**
 * What a pending expense does to its category's limit — used to warn at the
 * moment of entry, while the user can still change their mind.
 *
 * Returns null when the category has no limit, so callers can stay silent
 * rather than inventing a ceiling.
 */
export const forecastLimit = (
  limits: CategoryLimit[],
  spendByCategory: Record<string, number>,
  category: string,
  pendingAmount: number,
): LimitForecast | null => {
  const name = String(category ?? '').trim();
  if (!name) return null;

  const match = (Array.isArray(limits) ? limits : []).find(
    (item) => item?.category === name && Number(item.amount) > 0,
  );
  if (!match) return null;

  const limit = Math.round(Number(match.amount));
  const spent = Math.round(Number(spendByCategory?.[name]) || 0);
  const projected = spent + Math.max(0, Math.round(Number(pendingAmount) || 0));
  const percent = Math.round((projected / limit) * 100);

  return { limit, spent, projected, remaining: limit - projected, status: getLimitStatus(percent) };
};
