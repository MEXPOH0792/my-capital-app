import { getDebtDeleteBlock, getTransactionRoot } from '../../domain/accounts.js';
import {
  isEditableHistoryTransaction,
  isLinkedTransactionPart,
  isReversibleTransferTransaction,
} from '../../domain/history.js';

export default function HistoryTransactionModal({
  store,
  copy,
  isEnglish,
  theme,
  fmt,
  locale,
  selectedTransaction,
  canDeleteTransaction,
  deleteTransaction,
  canReverseTransfer,
  reverseTransfer,
  openTransactionEditModal,
  setModal,
}) {
  if (!selectedTransaction) return null;

  const isTransfer = selectedTransaction.type === 'transfer';
  // The sadaka share and the reserve are parts of one income: editing or
  // deleting them acts on that income, which owns their effects.
  const isPart = isLinkedTransactionPart(selectedTransaction);
  const rootTransaction = getTransactionRoot(store?.transactions, selectedTransaction);
  const canEdit = isEditableHistoryTransaction(rootTransaction);
  const canDelete = canDeleteTransaction(selectedTransaction);
  const partNote =
    isPart && rootTransaction !== selectedTransaction
      ? isEnglish
        ? `Part of the income "${rootTransaction.category}". Edit or delete that income to change it.`
        : `Часть дохода «${rootTransaction.category}». Изменяется и удаляется вместе с ним.`
      : null;
  const debtBlock = getDebtDeleteBlock(store?.transactions, rootTransaction);
  const blockedNote =
    debtBlock === 'has_payments'
      ? isEnglish
        ? 'This operation opened a debt that already has payments. Delete those payments first.'
        : 'Эта операция открыла долг, по которому уже есть платежи. Сначала удали платежи по этому долгу.'
      : debtBlock === 'legacy'
        ? isEnglish
          ? 'This debt record was made by an older version and cannot be rolled back. Correct balances on the Accounts screen.'
          : 'Эту запись о долге сделала старая версия, откатить её нельзя. Поправь остатки на экране «Счета».'
        : !canDelete && !isTransfer && rootTransaction?.meta
          ? isEnglish
            ? 'Cannot roll back: part of this money has already been spent or moved. Correct the balance on the Accounts screen.'
            : 'Откатить нельзя: часть этих денег уже потрачена или переведена. Поправь остаток на экране «Счета».'
          : null;
  const canReverse = isReversibleTransferTransaction(selectedTransaction) && canReverseTransfer(selectedTransaction);
  const typeLabel =
    selectedTransaction.type === 'income'
      ? isEnglish
        ? 'Income'
        : 'Доход'
      : selectedTransaction.type === 'expense'
        ? isEnglish
          ? 'Expense'
          : 'Расход'
        : isEnglish
          ? 'Transfer'
          : 'Перевод';
  const accountLabel = isEnglish ? 'Account' : 'Счёт';
  const routeLabel = isEnglish ? 'Route' : 'Маршрут';
  const editLabel = isEnglish ? 'Edit' : 'Редактировать';
  const reverseLabel = isEnglish ? 'Reverse transfer' : 'Отменить перевод';
  const deleteLabel = isEnglish ? 'Delete' : 'Удалить';
  const closeLabel = isEnglish ? 'Close' : 'Закрыть';

  return (
    <div className="space-y-3">
      <h3 className="text-center text-[10px] font-semibold opacity-40">
        {copy.history?.title || (isEnglish ? 'History' : 'История')}
      </h3>

      <div
        className="rounded-[16px] border px-4 py-3"
        style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold opacity-55">{typeLabel}</p>
            <p className="mt-1 text-[14px] font-bold leading-tight">{selectedTransaction.category}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'Amount' : 'Сумма'}</p>
            <p className="mt-1 text-[16px] font-numbers font-extrabold">
              {selectedTransaction.type === 'income' ? '+' : selectedTransaction.type === 'expense' ? '-' : '↔'}
              {fmt(selectedTransaction.amount)}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2 text-[11px] leading-[1.35] opacity-70">
          <p>{new Date(selectedTransaction.date).toLocaleString(locale)}</p>
          {selectedTransaction.meta?.accountName && !isTransfer ? (
            <p>
              {accountLabel}: {selectedTransaction.meta.accountName}
            </p>
          ) : null}
          {selectedTransaction.meta?.fromAccountName && selectedTransaction.meta?.toAccountName ? (
            <p>
              {routeLabel}: {selectedTransaction.meta.fromAccountName} → {selectedTransaction.meta.toAccountName}
            </p>
          ) : null}
        </div>

        {partNote || blockedNote ? (
          <div className="mt-3 space-y-1 text-[11px] leading-[1.35] opacity-70">
            {partNote ? <p>{partNote}</p> : null}
            {blockedNote ? <p>{blockedNote}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {canEdit ? (
          <button
            type="button"
            onClick={() => openTransactionEditModal(rootTransaction)}
            className="w-full rounded-[16px] border px-4 py-3 text-[10px] font-semibold text-[var(--mc-positive)]"
            style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}
          >
            {isPart ? (isEnglish ? 'Edit income' : 'Изменить доход') : editLabel}
          </button>
        ) : null}

        {canReverse ? (
          <button
            type="button"
            onClick={() => {
              reverseTransfer(selectedTransaction.id);
              setModal(null);
            }}
            className="w-full rounded-[16px] border px-4 py-3 text-[10px] font-semibold text-[var(--mc-positive)]"
            style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}
          >
            {reverseLabel}
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            onClick={() => {
              if (deleteTransaction(selectedTransaction)) {
                setModal(null);
              }
            }}
            className="w-full rounded-[16px] border px-4 py-3 text-[10px] font-semibold text-[var(--mc-negative)]"
            style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}
          >
            {isPart ? (isEnglish ? 'Delete income' : 'Удалить доход') : deleteLabel}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setModal(null)}
          className="w-full rounded-[16px] border px-4 py-3 text-[10px] font-semibold "
          style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
