import { useEffect, useState } from 'react';
import { measurePerf } from '../utils/perfMarks.js';
import { useModalComputed } from './modal/useModalComputed.js';
import { useModalHandlers } from './modal/useModalHandlers.js';
import { useModalState } from './modal/useModalState.js';

export function useModalFlow({ store, copy, isEnglish, spendableAccounts, fmt, formatStoredInput }) {
  const [modal, setModal] = useState(null);
  const {
    inputValue,
    setInputValue,
    selectedDebt,
    setSelectedDebt,
    selectedTransaction,
    setSelectedTransaction,
    debtForm,
    setDebtForm,
    transactionCategoryForm,
    setTransactionCategoryForm,
    selectedSpendAccountId,
    setSelectedSpendAccountId,
    resetModalState,
  } = useModalState({
    modal,
    spendableAccounts,
  });

  const {
    activeTransactionCategoryPresets,
    resolvedTransactionCategory,
    isModalAmountValid,
    modalHelperText,
    limitForecast,
    canSubmitAction,
  } = useModalComputed({
    modal,
    store,
    copy,
    isEnglish,
    spendableAccounts,
    fmt,
    inputValue,
    transactionCategoryForm,
    selectedSpendAccountId,
    selectedDebt,
    selectedTransaction,
  });

  const closeModal = () => {
    resetModalState();
    setModal(null);
  };

  useEffect(() => {
    if (!modal) return;
    measurePerf(`modal:${modal}:ready`, `modal:${modal}:start`, `modal:${modal}:ready-mark`);
  }, [modal]);

  const {
    openTransactionModal,
    openAmountModal,
    openDebtPaymentModal,
    openNewDebtModal,
    openEditDebtModal,
    openHistoryTransactionModal,
    openTransactionEditModal,
    handleAction,
    submitDebt,
    deleteSelectedDebt,
  } = useModalHandlers({
    store,
    spendableAccounts,
    formatStoredInput,
    closeModal,
    modal,
    inputValue,
    selectedDebt,
    selectedTransaction,
    selectedSpendAccountId,
    debtForm,
    setDebtForm,
    setModal,
    setInputValue,
    setSelectedDebt,
    setSelectedTransaction,
    setSelectedSpendAccountId,
    setTransactionCategoryForm,
    resolvedTransactionCategory,
    canSubmitAction,
  });

  return {
    modal,
    setModal: closeModal,
    inputValue,
    setInputValue,
    selectedDebt,
    selectedTransaction,
    debtForm,
    setDebtForm,
    transactionCategoryForm,
    setTransactionCategoryForm,
    selectedSpendAccountId,
    setSelectedSpendAccountId,
    activeTransactionCategoryPresets,
    removeIncomePreset: (preset) => store.hideIncomePreset(store.language, preset),
    removeExpensePreset: (preset) => store.hideExpensePreset(store.language, preset),
    modalHelperText,
    limitForecast,
    isModalAmountValid,
    handleAction,
    canSubmitAction,
    submitDebt,
    deleteSelectedDebt,
    openTransactionModal,
    openAmountModal,
    openDebtPaymentModal,
    openNewDebtModal,
    openEditDebtModal,
    openHistoryTransactionModal,
    openTransactionEditModal,
  };
}
