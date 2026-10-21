import { getCopy } from '../../i18n.js';
import { distributeIncome } from '../../domain/finance.js';
import { toSafeMinorAmount } from '../../utils/money.js';
import {
  allocateLiquidToSystemAccounts,
  allocateProtectedToSystemAccount,
  createId,
  getDebtDeleteBlock,
  getTransactionGroupIds,
  getTransactionRoot,
  moveFromAccount,
  moveToAccount,
  rollbackTransactionState,
  syncMonthlyCoverage,
  syncTotalsFromAccounts,
  toSafeText,
} from '../stateHelpers.js';

/**
 * Builds everything one income produces: the new account balances, coverage,
 * sadaka total and the history records.
 *
 * With distribution on, the income record owns every effect — liquid, safety,
 * capital and sadaka — so deleting or editing it rolls all of them back at
 * once. The reserve and sadaka records are display-only parts linked through
 * `meta.parentId`.
 *
 * `options.id` / `options.date` let an edit rebuild an income in place.
 * `options.coverageMonthKey` pins coverage to the month the income was first
 * recorded; when that month is over, the reserve is not re-evaluated against
 * the current month's bills.
 */
const buildIncome = (state, safeAmount, safeCategory, options = {}) => {
  const copy = getCopy(state.language);
  const id = options.id || createId();
  const date = options.date || new Date().toISOString();
  const monthlyCoverage = syncMonthlyCoverage(state.monthlyCoverage);
  const isCurrentMonth = !options.coverageMonthKey || options.coverageMonthKey === monthlyCoverage.monthKey;
  const coverageMonthKey = isCurrentMonth ? monthlyCoverage.monthKey : options.coverageMonthKey;
  const liquidPrimaryAccount = state.accounts.find((item) => item.systemKey === 'liquidPrimary');
  const safetyAccount = state.accounts.find((item) => item.systemKey === 'safety');
  const capitalAccount = state.accounts.find((item) => item.systemKey === 'capital');
  const sadakaAccount = state.accounts.find((item) => item.systemKey === 'sadaka');

  if (!state.incomeDistributionEnabled) {
    const accounts = allocateLiquidToSystemAccounts(state.accounts, state.storageSetup, safeAmount);
    return {
      accounts,
      totalSadakaPaid: state.totalSadakaPaid,
      monthlyCoverage: isCurrentMonth
        ? { ...monthlyCoverage, incomeTotal: monthlyCoverage.incomeTotal + safeAmount }
        : monthlyCoverage,
      records: [
        {
          id,
          type: 'income',
          amount: safeAmount,
          category: safeCategory,
          date,
          meta: {
            accountId: liquidPrimaryAccount?.id || null,
            accountName: liquidPrimaryAccount?.name || null,
            effects: liquidPrimaryAccount ? [{ accountId: liquidPrimaryAccount.id, delta: safeAmount }] : [],
            coverage: { monthKey: coverageMonthKey, incomeTotalDelta: safeAmount, requiredCoveredDelta: 0 },
          },
        },
      ],
    };
  }

  let reservedForRequired = 0;
  if (state.incomeDistributionBasis === 'free_after_required') {
    if (isCurrentMonth) {
      const totalRequired = state.requiredExpenses.reduce((sum, item) => sum + item.amount, 0);
      const uncoveredRequired = Math.max(0, totalRequired - monthlyCoverage.requiredCovered);
      reservedForRequired = Math.min(safeAmount, uncoveredRequired);
    } else {
      reservedForRequired = Math.min(safeAmount, Math.max(0, Number(options.previousReserved) || 0));
    }
  }
  const distributableAmount = Math.max(0, safeAmount - reservedForRequired);

  const { toBalance, toSafety, toCapital, toSadaka } = distributeIncome(distributableAmount, state.allocationPercents);
  let accounts = allocateLiquidToSystemAccounts(state.accounts, state.storageSetup, reservedForRequired + toBalance);
  accounts = allocateProtectedToSystemAccount(accounts, 'safety', toSafety);
  accounts = allocateProtectedToSystemAccount(accounts, 'capital', toCapital);
  // Without a sadaka account the share stays on the main balance instead of
  // vanishing from every account.
  const sadakaShare = sadakaAccount ? toSadaka : 0;
  if (sadakaAccount) {
    accounts = allocateProtectedToSystemAccount(accounts, 'sadaka', sadakaShare);
  } else {
    accounts = allocateLiquidToSystemAccounts(accounts, state.storageSetup, toSadaka);
  }
  const liquidPrimaryNext = accounts.find((item) => item.systemKey === 'liquidPrimary');
  const primaryDelta = (liquidPrimaryNext?.balance || 0) - (liquidPrimaryAccount?.balance || 0);

  return {
    accounts,
    totalSadakaPaid: state.totalSadakaPaid + sadakaShare,
    monthlyCoverage: isCurrentMonth
      ? {
          ...monthlyCoverage,
          incomeTotal: monthlyCoverage.incomeTotal + safeAmount,
          requiredCovered: monthlyCoverage.requiredCovered + reservedForRequired,
        }
      : monthlyCoverage,
    records: [
      {
        id,
        type: 'income',
        amount: safeAmount,
        category: safeCategory,
        date,
        meta: {
          accountId: liquidPrimaryNext?.id || liquidPrimaryAccount?.id || null,
          accountName: liquidPrimaryNext?.name || liquidPrimaryAccount?.name || null,
          distributed: true,
          effects: [
            liquidPrimaryAccount ? { accountId: liquidPrimaryAccount.id, delta: primaryDelta } : null,
            safetyAccount ? { accountId: safetyAccount.id, delta: toSafety } : null,
            capitalAccount ? { accountId: capitalAccount.id, delta: toCapital } : null,
            sadakaAccount ? { accountId: sadakaAccount.id, delta: sadakaShare } : null,
          ].filter((item) => item && item.delta !== 0),
          ...(sadakaShare > 0 ? { sadakaPaidDelta: sadakaShare } : {}),
          coverage: {
            monthKey: coverageMonthKey,
            incomeTotalDelta: safeAmount,
            requiredCoveredDelta: reservedForRequired,
          },
        },
      },
      ...(reservedForRequired > 0
        ? [
            {
              id: createId(),
              type: 'expense',
              amount: reservedForRequired,
              category: copy.common.reserveForRequired,
              date,
              meta: { parentId: id, system: 'reserve' },
            },
          ]
        : []),
      ...(sadakaShare > 0
        ? [
            {
              id: createId(),
              type: 'expense',
              amount: sadakaShare,
              category: copy.common.sadakaAuto,
              date,
              meta: { parentId: id, system: 'sadaka', accountId: sadakaAccount.id, accountName: sadakaAccount.name },
            },
          ]
        : []),
    ],
  };
};

export const createCashflowActions = (set) => ({
  addIncome: (amount, category) =>
    set((state) => {
      const copy = getCopy(state.language);
      const safeAmount = toSafeMinorAmount(amount);
      const safeCategory = toSafeText(category, copy.modal.income);
      if (safeAmount <= 0) return {};
      const built = buildIncome(state, safeAmount, safeCategory);
      return {
        ...syncTotalsFromAccounts(built.accounts),
        totalSadakaPaid: built.totalSadakaPaid,
        monthlyCoverage: built.monthlyCoverage,
        transactions: [...built.records, ...state.transactions],
      };
    }),
  addExpense: (amount, category, accountId) =>
    set((state) => {
      const copy = getCopy(state.language);
      const safeAmount = toSafeMinorAmount(amount);
      const safeCategory = toSafeText(category, copy.modal.expense);
      if (safeAmount <= 0 || safeAmount > state.availableBalance) return {};
      const spendAccountId =
        accountId ||
        state.accounts.find((item) => item.isPrimary && item.balance >= safeAmount)?.id ||
        state.accounts.find((item) => item.includeInSpendable && item.balance >= safeAmount)?.id;
      const spendAccount = state.accounts.find((item) => item.id === spendAccountId);
      const accounts = moveFromAccount(state.accounts, spendAccountId, safeAmount);
      if (!accounts) return {};
      return {
        ...syncTotalsFromAccounts(accounts),
        transactions: [
          {
            id: createId(),
            type: 'expense',
            amount: safeAmount,
            category: safeCategory,
            date: new Date().toISOString(),
            meta: spendAccount
              ? {
                  accountId: spendAccount.id,
                  accountName: spendAccount.name,
                  effects: [{ accountId: spendAccount.id, delta: -safeAmount }],
                }
              : null,
          },
          ...state.transactions,
        ],
      };
    }),
  updateIncomeTransaction: (transactionId, amount, category) =>
    set((state) => {
      const transaction = state.transactions.find((item) => item.id === transactionId);
      const safeAmount = toSafeMinorAmount(amount);
      if (!transaction || transaction.type !== 'income' || safeAmount <= 0) return {};

      const rollback = rollbackTransactionState(state, transaction);
      if (!rollback) return {};
      const safeCategory = toSafeText(category, transaction.category);

      // A distributed income is rebuilt from scratch with the new amount, so
      // safety, capital, sadaka and the reserve all follow the edit.
      if (transaction.meta?.distributed) {
        const groupIds = getTransactionGroupIds(state.transactions, transaction.id);
        const built = buildIncome(
          { ...state, ...rollback, totalSadakaPaid: rollback.totalSadakaPaid },
          safeAmount,
          safeCategory,
          {
            id: transaction.id,
            date: transaction.date,
            coverageMonthKey: transaction.meta.coverage?.monthKey,
            previousReserved: transaction.meta.coverage?.requiredCoveredDelta,
          },
        );
        const transactions = [];
        state.transactions.forEach((item) => {
          if (item.id === transaction.id) transactions.push(...built.records);
          else if (!groupIds.has(item.id)) transactions.push(item);
        });
        return {
          debts: rollback.debts,
          totalSadakaPaid: built.totalSadakaPaid,
          monthlyCoverage: built.monthlyCoverage,
          ...syncTotalsFromAccounts(built.accounts),
          transactions,
        };
      }

      const targetAccountId = transaction.meta?.accountId || transaction.meta?.effects?.[0]?.accountId;
      const targetAccount = rollback.accounts.find((item) => item.id === targetAccountId);
      if (!targetAccount) return {};

      const accounts = moveToAccount(rollback.accounts, targetAccount.id, safeAmount);
      const monthlyCoverage = syncMonthlyCoverage(rollback.monthlyCoverage);
      // An income from a finished month stays in that month: the current
      // month's income total must not grow when an old record is corrected.
      const originalMonthKey = transaction.meta?.coverage?.monthKey || monthlyCoverage.monthKey;
      const isCurrentMonth = originalMonthKey === monthlyCoverage.monthKey;

      return {
        debts: rollback.debts,
        monthlyCoverage: isCurrentMonth
          ? { ...monthlyCoverage, incomeTotal: monthlyCoverage.incomeTotal + safeAmount }
          : monthlyCoverage,
        totalSadakaPaid: rollback.totalSadakaPaid,
        ...syncTotalsFromAccounts(accounts),
        transactions: state.transactions.map((item) =>
          item.id !== transactionId
            ? item
            : {
                ...item,
                amount: safeAmount,
                category: safeCategory,
                meta: {
                  accountId: targetAccount.id,
                  accountName: targetAccount.name,
                  effects: [{ accountId: targetAccount.id, delta: safeAmount }],
                  coverage: {
                    monthKey: originalMonthKey,
                    incomeTotalDelta: safeAmount,
                    requiredCoveredDelta: 0,
                  },
                },
              },
        ),
      };
    }),
  updateExpenseTransaction: (transactionId, amount, category, accountId) =>
    set((state) => {
      const transaction = state.transactions.find((item) => item.id === transactionId);
      const safeAmount = toSafeMinorAmount(amount);
      if (!transaction || transaction.type !== 'expense' || !transaction.meta?.accountId || safeAmount <= 0) return {};

      const rollback = rollbackTransactionState(state, transaction);
      if (!rollback) return {};

      const baseTotals = syncTotalsFromAccounts(rollback.accounts);
      const nextAccountId = accountId || transaction.meta.accountId;
      const spendAccount = rollback.accounts.find((item) => item.id === nextAccountId && item.includeInSpendable);
      const safeCategory = toSafeText(category, transaction.category);
      if (!spendAccount || safeAmount > baseTotals.availableBalance || safeAmount > spendAccount.balance) return {};

      const accounts = moveFromAccount(rollback.accounts, nextAccountId, safeAmount);
      if (!accounts) return {};
      const nextSpendAccount = accounts.find((item) => item.id === nextAccountId) || spendAccount;

      return {
        debts: rollback.debts,
        monthlyCoverage: rollback.monthlyCoverage,
        totalSadakaPaid: rollback.totalSadakaPaid,
        ...syncTotalsFromAccounts(accounts),
        transactions: state.transactions.map((item) =>
          item.id !== transactionId
            ? item
            : {
                ...item,
                amount: safeAmount,
                category: safeCategory,
                meta: {
                  accountId: nextSpendAccount.id,
                  accountName: nextSpendAccount.name,
                  effects: [{ accountId: nextSpendAccount.id, delta: -safeAmount }],
                },
              },
        ),
      };
    }),
  /**
   * Deletes an operation and rolls back its effect on balances. A part of a
   * distributed income (sadaka share, reserve) deletes the whole income, since
   * the income owns those effects. The record that opened a debt deletes the
   * debt too, once no payments against it are left.
   */
  deleteTransaction: (transactionId) =>
    set((state) => {
      const selected = state.transactions.find((item) => item.id === transactionId);
      if (!selected) return {};
      const transaction = getTransactionRoot(state.transactions, selected);
      if (getDebtDeleteBlock(state.transactions, transaction)) return {};
      const rollback = rollbackTransactionState(state, transaction);
      if (!rollback) return {};
      const groupIds = getTransactionGroupIds(state.transactions, transaction.id);
      // The record that opened a debt takes the debt with it.
      const opensDebt = ['created', 'lent'].includes(transaction.meta?.debtKind) && transaction.meta?.debtId;
      return {
        debts: opensDebt ? rollback.debts.filter((item) => item.id !== transaction.meta.debtId) : rollback.debts,
        monthlyCoverage: rollback.monthlyCoverage,
        totalSadakaPaid: rollback.totalSadakaPaid,
        ...syncTotalsFromAccounts(rollback.accounts),
        transactions: state.transactions.filter((item) => !groupIds.has(item.id)),
      };
    }),
});
