import { getDebtDeleteBlock, getTransactionRoot, rollbackTransactionState } from '../../domain/accounts.js';
import { isEditableHistoryTransaction } from '../../domain/history.js';
import { hapticSuccess } from '../../utils/haptics.js';

export function useTransactionActions({ store, isEnglish }) {
  const canEditTransaction = (transaction) => isEditableHistoryTransaction(transaction);

  // A sadaka share or reserve record is part of its income: it is deletable
  // exactly when the whole income can be rolled back.
  const canDeleteTransaction = (transaction) => {
    const root = getTransactionRoot(store.transactions, transaction);
    if (getDebtDeleteBlock(store.transactions, root)) return false;
    return Boolean(
      root?.meta &&
      rollbackTransactionState(
        {
          accounts: store.accounts,
          debts: store.debts,
          monthlyCoverage: store.monthlyCoverage,
        },
        root,
      ),
    );
  };

  const deleteTransaction = (transaction) => {
    if (!transaction || !canDeleteTransaction(transaction)) return false;
    const root = getTransactionRoot(store.transactions, transaction);
    const isGroup = root?.meta?.distributed || root !== transaction;
    const opensDebt = ['created', 'lent'].includes(root?.meta?.debtKind);
    const confirmed = window.confirm(
      opensDebt
        ? isEnglish
          ? 'Delete this debt together with the operation that opened it, and roll back the money?'
          : 'Удалить этот долг вместе с операцией, которая его открыла, и откатить деньги?'
        : isGroup
          ? isEnglish
            ? `Delete the income "${root.category}" with its sadaka, safety and capital shares, and roll them back?`
            : `Удалить доход «${root.category}» вместе с долями садаки, подушки и капитала и откатить их?`
          : isEnglish
            ? 'Delete this operation and roll back its effect on balances?'
            : 'Удалить эту операцию и откатить её влияние на балансы?',
    );
    if (!confirmed) return false;
    store.deleteTransaction(transaction.id);
    hapticSuccess();
    return true;
  };

  return {
    canEditTransaction,
    canDeleteTransaction,
    deleteTransaction,
  };
}
