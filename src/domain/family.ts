// Family budget: one partner shares a month of their spending as a file, and
// the receiving app shows a combined total.
//
// Everything here is pure. The partner's money never touches the user's
// accounts — these figures exist only for the report screen.

import type { Transaction } from './types.js';
import { isReportedExpense } from './history.js';

export const FAMILY_REPORT_KIND = 'my-capital:family-report';
export const FAMILY_REPORT_VERSION = 1;
/** Two years of monthly reports is plenty; older ones are dropped on import. */
export const MAX_FAMILY_REPORTS = 24;

export interface FamilyCategoryAmount {
  category: string;
  amount: number;
}

export interface FamilyMonthSummary {
  monthKey: string;
  expensesTotal: number;
  categories: FamilyCategoryAmount[];
}

export interface FamilyReportFile extends FamilyMonthSummary {
  kind: typeof FAMILY_REPORT_KIND;
  v: number;
  sender: { id: string; name: string };
  currency: string;
  exportedAt: string;
}

export interface FamilyReport extends FamilyMonthSummary {
  currency: string;
  exportedAt: string;
  importedAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  senderId: string;
  currency: string;
  addedAt: string;
}

export type FamilyImportProblem = 'not_a_report' | 'newer_version' | 'currency_mismatch' | 'other_device';

export class FamilyReportError extends Error {
  code: FamilyImportProblem;
  /** Extra facts the UI puts into its sentence, e.g. both currency codes. */
  detail: Record<string, string>;

  constructor(code: FamilyImportProblem, message: string, detail: Record<string, string> = {}) {
    super(message);
    this.name = 'FamilyReportError';
    this.code = code;
    this.detail = detail;
  }
}

const toWholeAmount = (value: unknown): number => {
  const amount = Math.round(Number(value) || 0);
  return amount > 0 ? amount : 0;
};

const toText = (value: unknown): string => String(value ?? '').trim();

/** YYYY-MM for a date. */
export const getMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** The month before `monthKey` ("2026-01" → "2025-12"). */
export const getPreviousMonthKey = (monthKey: string): string => {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return monthKey;
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
};

export const formatMonthLabel = (monthKey: string, locale: string): string => {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return monthKey;
  const label = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * What the user spent in one calendar month, grouped by category.
 *
 * Built from the same rule the report screen uses, so the reserve for required
 * bills, the sadaka share and debt movements stay out of it.
 */
export const getMonthlyExpenseSummary = (
  transactions: Transaction[] | unknown[],
  monthKey: string,
): FamilyMonthSummary => {
  const byCategory = new Map<string, number>();
  let expensesTotal = 0;

  (Array.isArray(transactions) ? transactions : []).forEach((item) => {
    const transaction = item as Transaction;
    if (!isReportedExpense(transaction)) return;
    const date = new Date(transaction.date);
    if (Number.isNaN(date.getTime()) || getMonthKey(date) !== monthKey) return;

    const amount = toWholeAmount(transaction.amount);
    if (amount === 0) return;
    const category = toText(transaction.category) || '—';
    byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
    expensesTotal += amount;
  });

  const categories = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));

  return { monthKey, expensesTotal, categories };
};

/**
 * The file a partner sends. It carries a month, a currency, a total and
 * categories — no operations, accounts, dates or balances.
 */
export const buildFamilyReportFile = ({
  senderId,
  senderName,
  currency,
  summary,
  exportedAt = new Date().toISOString(),
}: {
  senderId: string;
  senderName: string;
  currency: string;
  summary: FamilyMonthSummary;
  exportedAt?: string;
}): FamilyReportFile => ({
  kind: FAMILY_REPORT_KIND,
  v: FAMILY_REPORT_VERSION,
  sender: { id: toText(senderId), name: toText(senderName) },
  monthKey: summary.monthKey,
  currency: toText(currency),
  expensesTotal: toWholeAmount(summary.expensesTotal),
  categories: summary.categories.map((item) => ({
    category: toText(item.category),
    amount: toWholeAmount(item.amount),
  })),
  exportedAt,
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Validates a received file. Throws FamilyReportError with a code the UI turns
 * into a sentence; `currency` is the receiving app's currency, because sums in
 * two currencies cannot be added.
 */
export const parseFamilyReportFile = (value: unknown, currency: string): FamilyReportFile => {
  if (!isPlainObject(value) || value.kind !== FAMILY_REPORT_KIND) {
    throw new FamilyReportError('not_a_report', 'Not a family report');
  }
  if (Number(value.v) > FAMILY_REPORT_VERSION) {
    throw new FamilyReportError('newer_version', 'Made by a newer version');
  }
  const monthKey = toText(value.monthKey);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    throw new FamilyReportError('not_a_report', 'Month is missing');
  }
  const fileCurrency = toText(value.currency);
  if (fileCurrency && toText(currency) && fileCurrency !== toText(currency)) {
    throw new FamilyReportError('currency_mismatch', `${fileCurrency} != ${currency}`, {
      fileCurrency,
      currency: toText(currency),
    });
  }

  const sender = isPlainObject(value.sender) ? value.sender : {};
  const categories = (Array.isArray(value.categories) ? value.categories : [])
    .filter(isPlainObject)
    .map((item) => ({ category: toText(item.category), amount: toWholeAmount(item.amount) }))
    .filter((item) => item.category && item.amount > 0);

  return {
    kind: FAMILY_REPORT_KIND,
    v: FAMILY_REPORT_VERSION,
    sender: { id: toText(sender.id), name: toText(sender.name) },
    monthKey,
    currency: fileCurrency || toText(currency),
    expensesTotal: toWholeAmount(value.expensesTotal),
    categories,
    exportedAt: toText(value.exportedAt) || new Date().toISOString(),
  };
};

/** Adds or replaces the report for its month, newest first, capped in length. */
export const upsertFamilyReport = (reports: FamilyReport[], report: FamilyReport): FamilyReport[] =>
  [...(Array.isArray(reports) ? reports : []).filter((item) => item.monthKey !== report.monthKey), report]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .slice(0, MAX_FAMILY_REPORTS);

export interface FamilyCategoryRow {
  category: string;
  mine: number;
  partner: number;
  total: number;
}

export interface FamilyMonthView {
  monthKey: string;
  mineTotal: number;
  partnerTotal: number;
  total: number;
  /** Share of the total spent by the user, 0-100. null when nothing was spent. */
  minePercent: number | null;
  categories: FamilyCategoryRow[];
  /** True when the partner has not shared this month yet. */
  partnerMissing: boolean;
}

/** The combined picture of one month: totals, shares and merged categories. */
export const getFamilyMonthView = (mine: FamilyMonthSummary, partner: FamilyReport | null): FamilyMonthView => {
  const rows = new Map<string, FamilyCategoryRow>();

  const add = (category: string, amount: number, side: 'mine' | 'partner') => {
    const key = toText(category) || '—';
    const row = rows.get(key) ?? { category: key, mine: 0, partner: 0, total: 0 };
    row[side] += amount;
    row.total += amount;
    rows.set(key, row);
  };

  mine.categories.forEach((item) => add(item.category, item.amount, 'mine'));
  partner?.categories.forEach((item) => add(item.category, item.amount, 'partner'));

  const mineTotal = toWholeAmount(mine.expensesTotal);
  const partnerTotal = partner ? toWholeAmount(partner.expensesTotal) : 0;
  const total = mineTotal + partnerTotal;

  return {
    monthKey: mine.monthKey,
    mineTotal,
    partnerTotal,
    total,
    minePercent: total > 0 ? Math.round((mineTotal / total) * 100) : null,
    categories: [...rows.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category)),
    partnerMissing: partner === null,
  };
};
