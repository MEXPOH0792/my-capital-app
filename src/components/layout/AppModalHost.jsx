import React, { Suspense, lazy } from 'react';
import { ModalSkeleton } from '../ui/Skeleton.jsx';

const AppModal = lazy(() => import('../modals/AppModal.jsx'));

export default function AppModalHost({
  modalFlow,
  store,
  allocationModes,
  isEnglish,
  isDarkMode,
  theme,
  panelStyle,
  copy,
  formatInput,
  softPanelStyle,
  selectFieldStyle,
  selectOptionStyle,
  spendableAccounts,
  fmt,
  canDeleteTransaction,
  deleteTransaction,
  canEditTransaction,
  canReverseTransfer,
  reverseTransfer,
}) {
  if (!modalFlow.modal) return null;

  return (
    <Suspense fallback={<ModalSkeleton />}>
      <AppModal
        modal={modalFlow.modal}
        setModal={modalFlow.setModal}
        store={store}
        allocationModes={allocationModes}
        isEnglish={isEnglish}
        isDarkMode={isDarkMode}
        theme={theme}
        panelStyle={panelStyle}
        copy={copy}
        selectedDebt={modalFlow.selectedDebt}
        inputValue={modalFlow.inputValue}
        setInputValue={modalFlow.setInputValue}
        formatInput={formatInput}
        activeTransactionCategoryPresets={modalFlow.activeTransactionCategoryPresets}
        removeIncomePreset={modalFlow.removeIncomePreset}
        removeExpensePreset={modalFlow.removeExpensePreset}
        transactionCategoryForm={modalFlow.transactionCategoryForm}
        setTransactionCategoryForm={modalFlow.setTransactionCategoryForm}
        softPanelStyle={softPanelStyle}
        selectedSpendAccountId={modalFlow.selectedSpendAccountId}
        setSelectedSpendAccountId={modalFlow.setSelectedSpendAccountId}
        selectFieldStyle={selectFieldStyle}
        selectOptionStyle={selectOptionStyle}
        spendableAccounts={spendableAccounts}
        fmt={fmt}
        canDeleteTransaction={canDeleteTransaction}
        deleteTransaction={deleteTransaction}
        canEditTransaction={canEditTransaction}
        canReverseTransfer={canReverseTransfer}
        reverseTransfer={reverseTransfer}
        modalHelperText={modalFlow.modalHelperText}
        limitForecast={modalFlow.limitForecast}
        isModalAmountValid={modalFlow.isModalAmountValid}
        handleAction={modalFlow.handleAction}
        canSubmitAction={modalFlow.canSubmitAction}
        selectedTransaction={modalFlow.selectedTransaction}
        debtForm={modalFlow.debtForm}
        setDebtForm={modalFlow.setDebtForm}
        submitDebt={modalFlow.submitDebt}
        deleteSelectedDebt={modalFlow.deleteSelectedDebt}
        openTransactionEditModal={modalFlow.openTransactionEditModal}
      />
    </Suspense>
  );
}
