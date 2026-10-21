import { useMemo } from 'react';
import { parseMoneyInputToMinor } from '../../utils/money.js';
import { hapticError, hapticSuccess } from '../../utils/haptics.js';

export function useTransferActions({ store, transferForm, setTransferForm }) {
  const fromTransferAccount = useMemo(
    () => store.accounts.find((item) => item.id === transferForm.fromId) || null,
    [store.accounts, transferForm.fromId],
  );
  const toTransferAccount = useMemo(
    () => store.accounts.find((item) => item.id === transferForm.toId) || null,
    [store.accounts, transferForm.toId],
  );

  const transferAmountValue = parseMoneyInputToMinor(transferForm.amount);
  const isTransferAmountValid = !Number.isNaN(transferAmountValue) && transferAmountValue > 0;
  const canSubmitTransfer = Boolean(
    fromTransferAccount &&
    toTransferAccount &&
    fromTransferAccount.id !== toTransferAccount.id &&
    isTransferAmountValid &&
    transferAmountValue <= fromTransferAccount.balance,
  );

  const submitTransfer = () => {
    if (!canSubmitTransfer) {
      hapticError();
      return;
    }
    store.transferBetweenAccounts(transferForm.fromId, transferForm.toId, transferAmountValue);
    setTransferForm({ fromId: '', toId: '', amount: '' });
    hapticSuccess();
  };

  const canReverseTransfer = (transaction) => {
    const sourceAccountId = transaction?.meta?.toAccountId;
    const sourceAccount = store.accounts.find((item) => item.id === sourceAccountId);
    return Boolean(sourceAccount && sourceAccount.balance >= transaction.amount);
  };

  const reverseTransfer = (transactionId) => {
    store.reverseTransfer(transactionId);
    hapticSuccess();
  };

  return {
    fromTransferAccount,
    toTransferAccount,
    transferAmountValue,
    isTransferAmountValid,
    canSubmitTransfer,
    submitTransfer,
    canReverseTransfer,
    reverseTransfer,
  };
}
