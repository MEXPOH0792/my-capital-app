import { getCopy } from '../../i18n.js';
import { toSafeMinorAmount } from '../../utils/money.js';
import {
  createId,
  moveFromAccount,
  moveToAccount,
  syncTotalsFromAccounts,
  toSafeRate,
  toSafeText,
} from '../stateHelpers.js';

/** The spendable account a debt's money moves through: the chosen one, else the main one. */
const resolveMoneyAccount = (accounts, accountId) =>
  accounts.find((item) => item.id === accountId && item.includeInSpendable) ||
  accounts.find((item) => item.isPrimary) ||
  accounts.find((item) => item.systemKey === 'liquidPrimary') ||
  null;

export const createDebtActions = (set) => ({
  /**
   * Opens a debt. Money moves through a real account, never through the
   * derived totals:
   *   LIABILITY + addToBalance — the loan lands on the chosen account;
   *   LIABILITY alone          — only the debt is recorded, no money moves;
   *   ASSET                    — the money I lent leaves the chosen account
   *                              (rejected when that account cannot cover it).
   * The history record carries the effects, so deleting it rolls back both
   * the money and the debt.
   */
  addDebt: (debtData) =>
    set((state) => {
      const copy = getCopy(state.language);
      const safeAmount = toSafeMinorAmount(debtData?.amount);
      if (safeAmount <= 0) return {};
      const type = debtData.type === 'ASSET' ? 'ASSET' : 'LIABILITY';
      const addToBalance = type === 'LIABILITY' && Boolean(debtData.addToBalance);
      const newDebt = {
        id: createId(),
        title: toSafeText(debtData.title, copy.modal.debt),
        type,
        status: 'ACTIVE',
        addToBalance,
        bankName: toSafeText(debtData.bankName, copy.debts.privatePerson),
        interestRate: toSafeRate(debtData.interestRate),
        initialBalance: safeAmount,
        currentBalance: safeAmount,
        createdAt: new Date().toISOString(),
      };

      const movesMoney = type === 'ASSET' || addToBalance;
      const account = movesMoney ? resolveMoneyAccount(state.accounts, debtData.accountId) : null;
      let accounts = state.accounts;
      if (movesMoney) {
        if (!account) return {};
        if (type === 'ASSET') {
          accounts = moveFromAccount(state.accounts, account.id, safeAmount);
          if (!accounts) return {};
        } else {
          accounts = moveToAccount(state.accounts, account.id, safeAmount);
        }
      }

      return {
        debts: [newDebt, ...state.debts],
        ...syncTotalsFromAccounts(accounts),
        transactions: [
          {
            id: createId(),
            type: type === 'LIABILITY' ? 'income' : 'expense',
            amount: safeAmount,
            category: `${copy.modal.debtCreated}: ${newDebt.title}`,
            date: new Date().toISOString(),
            meta: {
              debtId: newDebt.id,
              debtKind: type === 'LIABILITY' ? 'created' : 'lent',
              ...(account
                ? {
                    accountId: account.id,
                    accountName: account.name,
                    effects: [{ accountId: account.id, delta: type === 'ASSET' ? -safeAmount : safeAmount }],
                  }
                : {}),
            },
          },
          ...state.transactions,
        ],
      };
    }),
  updateDebt: (debtId, debtData) =>
    set((state) => {
      const debt = state.debts.find((item) => item.id === debtId);
      const safeAmount = toSafeMinorAmount(debtData.amount);
      if (!debt || !debtData.title || safeAmount <= 0) return {};

      const nextInitialBalance = Math.max(debt.initialBalance, safeAmount);
      const nextCurrentBalance = Math.min(safeAmount, nextInitialBalance);

      return {
        debts: state.debts.map((item) =>
          item.id !== debtId
            ? item
            : {
                ...item,
                title: toSafeText(debtData.title, item.title),
                bankName: toSafeText(debtData.bankName, item.bankName),
                interestRate: toSafeRate(debtData.interestRate),
                initialBalance: nextInitialBalance,
                currentBalance: nextCurrentBalance,
                status: nextCurrentBalance <= 0 ? 'CLOSED' : 'ACTIVE',
              },
        ),
      };
    }),
  deleteDebt: (debtId) =>
    set((state) => {
      if (!state.debts.some((item) => item.id === debtId)) return {};
      // Plain removal of the tracking record. Past payments/creations were
      // already recorded as their own transactions and affected balances at
      // the time, so we intentionally do not touch accounts here.
      return { debts: state.debts.filter((item) => item.id !== debtId) };
    }),
  payDebt: (debtId, paymentAmount, accountId) =>
    set((state) => {
      const copy = getCopy(state.language);
      const debt = state.debts.find((item) => item.id === debtId);
      const safePayment = toSafeMinorAmount(paymentAmount);
      if (!debt || safePayment <= 0) return {};
      if (debt.type === 'LIABILITY' && safePayment > state.availableBalance) return {};
      const appliedPayment = Math.min(safePayment, debt.currentBalance);
      if (appliedPayment <= 0) return {};
      const updatedDebts = state.debts.map((item) => {
        if (item.id !== debtId) return item;
        const newBalance = Math.max(0, item.currentBalance - appliedPayment);
        return { ...item, currentBalance: newBalance, status: newBalance === 0 ? 'CLOSED' : item.status };
      });
      const isLiability = debt.type === 'LIABILITY';
      let accounts = state.accounts;
      let spendAccount = null;
      if (isLiability) {
        const spendAccountId =
          accountId ||
          state.accounts.find((item) => item.isPrimary && item.balance >= appliedPayment)?.id ||
          state.accounts.find((item) => item.includeInSpendable && item.balance >= appliedPayment)?.id;
        spendAccount = state.accounts.find((item) => item.id === spendAccountId) || null;
        const deducted = moveFromAccount(state.accounts, spendAccountId, appliedPayment);
        if (!deducted) return {};
        accounts = deducted;
      } else {
        spendAccount = resolveMoneyAccount(state.accounts, accountId);
        if (!spendAccount) return {};
        accounts = moveToAccount(state.accounts, spendAccount.id, appliedPayment);
      }
      return {
        debts: updatedDebts,
        ...syncTotalsFromAccounts(accounts),
        transactions: [
          {
            id: createId(),
            type: isLiability ? 'expense' : 'income',
            amount: appliedPayment,
            category: `${copy.modal.debtPayment}: ${debt.title}`,
            date: new Date().toISOString(),
            meta: spendAccount
              ? {
                  accountId: spendAccount.id,
                  accountName: spendAccount.name,
                  debtId: debt.id,
                  debtKind: isLiability ? 'payment' : 'repaid_to_me',
                  effects: [{ accountId: spendAccount.id, delta: isLiability ? -appliedPayment : appliedPayment }],
                  debtEffects: [{ debtId: debt.id, currentBalanceDelta: -appliedPayment }],
                }
              : null,
          },
          ...state.transactions,
        ],
      };
    }),
});
