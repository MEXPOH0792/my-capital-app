import type { Transaction } from './types.js';

const isDistributedIncome = (transaction: Transaction | null | undefined): boolean =>
  Boolean(
    transaction?.type === 'income' &&
    transaction?.meta?.distributed === true &&
    !transaction?.meta?.parentId &&
    !Array.isArray(transaction?.meta?.debtEffects) &&
    !transaction?.meta?.debtId,
  );

/** A display-only part of a distributed income: it is edited and deleted through that income. */
export const isLinkedTransactionPart = (transaction: Transaction | null | undefined): boolean =>
  Boolean(transaction?.meta?.parentId);

export const isEditableIncomeTransaction = (transaction: Transaction | null | undefined): boolean =>
  isDistributedIncome(transaction) ||
  Boolean(
    transaction?.type === 'income' &&
    (transaction?.meta?.accountId || transaction?.meta?.effects?.[0]?.accountId) &&
    Array.isArray(transaction?.meta?.effects) &&
    transaction.meta.effects.length === 1 &&
    !Array.isArray(transaction?.meta?.debtEffects) &&
    !transaction?.meta?.debtId &&
    !transaction?.meta?.debtKind &&
    !transaction?.meta?.sadakaPaidDelta &&
    (!transaction?.meta?.coverage || transaction.meta.coverage.requiredCoveredDelta === 0),
  );

export const isEditableExpenseTransaction = (transaction: Transaction | null | undefined): boolean =>
  Boolean(
    transaction?.type === 'expense' &&
    transaction?.meta?.accountId &&
    !transaction?.meta?.parentId &&
    Array.isArray(transaction?.meta?.effects) &&
    transaction.meta.effects.length > 0 &&
    !Array.isArray(transaction?.meta?.debtEffects) &&
    !transaction?.meta?.debtId &&
    !transaction?.meta?.debtKind &&
    !transaction?.meta?.sadakaPaidDelta,
  );

export const isReversibleTransferTransaction = (transaction: Transaction | null | undefined): boolean =>
  Boolean(transaction?.type === 'transfer' && transaction?.meta?.fromAccountId && transaction?.meta?.toAccountId);

export const isEditableHistoryTransaction = (transaction: Transaction | null | undefined): boolean =>
  isEditableIncomeTransaction(transaction) || isEditableExpenseTransaction(transaction);

// Taking a loan, lending money and getting it back move money but are neither
// earned nor spent. Paying down my own loan stays a real expense.
const NON_REPORTED_DEBT_KINDS = new Set(['created', 'lent', 'repaid_to_me']);

const isDebtFlow = (transaction: Transaction | null | undefined): boolean =>
  NON_REPORTED_DEBT_KINDS.has(transaction?.meta?.debtKind ?? '');

/** Income that reports, trends and goal pace should count. */
export const isReportedIncome = (transaction: Transaction | null | undefined): boolean =>
  transaction?.type === 'income' && !isDebtFlow(transaction);

/**
 * Spending that reports, limits and trends should count. The reserve for
 * required bills and the sadaka share are money set aside, not spent.
 * Recognised by their flag, so a language switch does not change the numbers.
 */
export const isReportedExpense = (transaction: Transaction | null | undefined): boolean =>
  transaction?.type === 'expense' && !isDebtFlow(transaction) && !transaction.meta?.system;

/**
 * The automatic sadaka share. It stays on the sadaka account, so like the
 * safety and capital shares it is money set aside, not spent; reports list it
 * on its own line.
 */
export const isSadakaSetAside = (transaction: Transaction | null | undefined): boolean =>
  transaction?.type === 'expense' && transaction.meta?.system === 'sadaka';

/** Anything the app wrote on its own: parts of an income, reserve, sadaka share, debt records. */
export const isSystemTransaction = (transaction: Transaction | null | undefined): boolean =>
  Boolean(transaction?.meta?.system || transaction?.meta?.parentId || transaction?.meta?.debtKind);
