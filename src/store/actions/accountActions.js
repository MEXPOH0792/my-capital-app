import {
  createId,
  moveFromAccount,
  moveAccountPriority,
  moveToAccount,
  setPrimaryAccount,
  syncTotalsFromAccounts,
  toSafeText,
} from '../stateHelpers.js';
import { toSafeMinorAmount } from '../../utils/money.js';

export const createAccountActions = (set) => ({
  addAccount: (name, initialBalance, includeInSpendable) =>
    set((state) => {
      const safeName = toSafeText(name);
      const safeBalance = toSafeMinorAmount(initialBalance);
      if (!safeName) return {};
      const accounts = [
        ...state.accounts,
        {
          id: createId(),
          name: safeName,
          balance: safeBalance,
          includeInSpendable: Boolean(includeInSpendable),
          isPrimary: false,
          isSystem: false,
          systemKey: null,
        },
      ];
      return syncTotalsFromAccounts(accounts);
    }),
  /**
   * Renames a custom account or flips whether it counts as spendable.
   *
   * System accounts are renamed through the storage setup screen, which keeps
   * their names in sync with `storageSetup`, so they are rejected here.
   * Past transactions keep their own copy of the account name, so history
   * still reads correctly after a rename.
   */
  updateAccount: (accountId, changes) =>
    set((state) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account || account.isSystem) return {};

      const nextName = changes?.name === undefined ? account.name : toSafeText(changes.name);
      if (!nextName) return {};
      const nextIncludeInSpendable =
        changes?.includeInSpendable === undefined ? account.includeInSpendable : Boolean(changes.includeInSpendable);

      if (nextName === account.name && nextIncludeInSpendable === account.includeInSpendable) return {};

      return syncTotalsFromAccounts(
        state.accounts.map((item) =>
          item.id === accountId ? { ...item, name: nextName, includeInSpendable: nextIncludeInSpendable } : item,
        ),
      );
    }),
  /**
   * Corrects the balance of any account, system ones included (safety,
   * capital, sadaka). Zero is a valid balance — this is how a test amount is
   * cleared. It is a correction, not an operation, so history is untouched.
   */
  setAccountBalance: (accountId, value) =>
    set((state) => {
      const account = state.accounts.find((item) => item.id === accountId);
      const nextBalance = Math.max(0, Math.round(Number(value) || 0));
      if (!account || !Number.isFinite(nextBalance) || nextBalance === account.balance) return {};
      return syncTotalsFromAccounts(
        state.accounts.map((item) => (item.id === accountId ? { ...item, balance: nextBalance } : item)),
      );
    }),
  /**
   * Removes a custom account. Money never disappears: whatever is left moves to
   * the primary account and is recorded as a transfer, so the history explains
   * where it went.
   */
  deleteAccount: (accountId) =>
    set((state) => {
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account || account.isSystem) return {};

      const remaining = state.accounts.filter((item) => item.id !== accountId);
      if (remaining.length === 0) return {};

      const leftover = toSafeMinorAmount(account.balance);
      if (leftover <= 0) return syncTotalsFromAccounts(remaining);

      const target =
        remaining.find((item) => item.isPrimary) ||
        remaining.find((item) => item.systemKey === 'liquidPrimary') ||
        remaining[0];

      return {
        ...syncTotalsFromAccounts(moveToAccount(remaining, target.id, leftover)),
        transactions: [
          {
            id: createId(),
            type: 'transfer',
            amount: leftover,
            category:
              state.language === 'en'
                ? `Account closed: ${account.name} -> ${target.name}`
                : `Счёт закрыт: ${account.name} -> ${target.name}`,
            date: new Date().toISOString(),
            meta: {
              fromAccountId: account.id,
              fromAccountName: account.name,
              toAccountId: target.id,
              toAccountName: target.name,
              // No effect for the closed account: it no longer exists, and its
              // balance is already folded into the target above.
              effects: [{ accountId: target.id, delta: leftover }],
            },
          },
          ...state.transactions,
        ],
      };
    }),
  setPrimaryAccount: (accountId) =>
    set((state) => {
      if (!accountId || !state.accounts.some((item) => item.id === accountId)) return {};
      return syncTotalsFromAccounts(setPrimaryAccount(state.accounts, accountId));
    }),
  moveAccountPriority: (accountId, direction) =>
    set((state) => {
      if (!accountId || !['up', 'down'].includes(direction)) return {};
      const nextAccounts = moveAccountPriority(state.accounts, accountId, direction);
      if (nextAccounts === state.accounts) return {};
      return syncTotalsFromAccounts(nextAccounts);
    }),
  transferBetweenAccounts: (fromId, toId, amount) =>
    set((state) => {
      const safeAmount = toSafeMinorAmount(amount);
      if (!fromId || !toId || fromId === toId || safeAmount <= 0) return {};
      const fromAccount = state.accounts.find((item) => item.id === fromId);
      const toAccount = state.accounts.find((item) => item.id === toId);
      if (!fromAccount || !toAccount) return {};
      const deducted = moveFromAccount(state.accounts, fromId, safeAmount);
      if (!deducted) return {};
      const accounts = moveToAccount(deducted, toId, safeAmount);
      return {
        ...syncTotalsFromAccounts(accounts),
        transactions: [
          {
            id: createId(),
            type: 'transfer',
            amount: safeAmount,
            category:
              state.language === 'en'
                ? `Transfer: ${fromAccount.name} -> ${toAccount.name}`
                : `Перевод: ${fromAccount.name} -> ${toAccount.name}`,
            date: new Date().toISOString(),
            meta: {
              fromAccountId: fromAccount.id,
              fromAccountName: fromAccount.name,
              toAccountId: toAccount.id,
              toAccountName: toAccount.name,
              effects: [
                { accountId: fromAccount.id, delta: -safeAmount },
                { accountId: toAccount.id, delta: safeAmount },
              ],
            },
          },
          ...state.transactions,
        ],
      };
    }),
  reverseTransfer: (transactionId) =>
    set((state) => {
      const original = state.transactions.find((item) => item.id === transactionId && item.type === 'transfer');
      const safeAmount = toSafeMinorAmount(original?.amount);
      const fromId = original?.meta?.fromAccountId;
      const toId = original?.meta?.toAccountId;
      if (!original || !fromId || !toId || safeAmount <= 0) return {};
      const sourceAccount = state.accounts.find((item) => item.id === toId);
      const targetAccount = state.accounts.find((item) => item.id === fromId);
      if (!sourceAccount || !targetAccount || sourceAccount.balance < safeAmount) return {};
      const deducted = moveFromAccount(state.accounts, toId, safeAmount);
      if (!deducted) return {};
      const accounts = moveToAccount(deducted, fromId, safeAmount);
      return {
        ...syncTotalsFromAccounts(accounts),
        transactions: [
          {
            id: createId(),
            type: 'transfer',
            amount: safeAmount,
            category:
              state.language === 'en'
                ? `Transfer return: ${sourceAccount.name} -> ${targetAccount.name}`
                : `Возврат перевода: ${sourceAccount.name} -> ${targetAccount.name}`,
            date: new Date().toISOString(),
            meta: {
              fromAccountId: sourceAccount.id,
              fromAccountName: sourceAccount.name,
              toAccountId: targetAccount.id,
              toAccountName: targetAccount.name,
              effects: [
                { accountId: sourceAccount.id, delta: -safeAmount },
                { accountId: targetAccount.id, delta: safeAmount },
              ],
            },
          },
          ...state.transactions,
        ],
      };
    }),
});
