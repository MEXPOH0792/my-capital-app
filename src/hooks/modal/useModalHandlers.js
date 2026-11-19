import { parseMoneyInputToMinor } from '../../utils/money.js';
import { markPerf } from '../../utils/perfMarks.js';
import { hapticError, hapticSuccess } from '../../utils/haptics.js';

const EMPTY_DEBT_FORM = {
  title: '',
  amount: '',
  type: 'LIABILITY',
  addToBalance: true,
  bankName: '',
  interestRate: '',
};

export function useModalHandlers({
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
}) {
  const openTransactionModal = (type) => {
    markPerf(`modal:${type}:start`);
    setTransactionCategoryForm({ preset: '', custom: '' });
    setInputValue('');
    setSelectedDebt(null);
    setSelectedTransaction(null);
    if (type === 'expense' || type === 'pay_debt') {
      setSelectedSpendAccountId(spendableAccounts[0]?.id || '');
    }
    setModal(type);
  };

  const openAmountModal = (type, value = 0) => {
    markPerf(`modal:${type}:start`);
    setInputValue(formatStoredInput(value));
    setSelectedTransaction(null);
    setModal(type);
  };

  const openDebtPaymentModal = (debt, value = 0) => {
    markPerf('modal:pay_debt:start');
    setSelectedDebt(debt);
    setSelectedTransaction(null);
    setSelectedSpendAccountId(spendableAccounts[0]?.id || '');
    setInputValue(value > 0 ? formatStoredInput(value) : '');
    setModal('pay_debt');
  };

  const openNewDebtModal = () => {
    markPerf('modal:new_debt:start');
    setDebtForm(EMPTY_DEBT_FORM);
    setSelectedDebt(null);
    setSelectedTransaction(null);
    setSelectedSpendAccountId(spendableAccounts.find((item) => item.isPrimary)?.id || spendableAccounts[0]?.id || '');
    setModal('new_debt');
  };

  const openEditDebtModal = (debt) => {
    if (!debt) return;
    markPerf('modal:edit_debt:start');
    setSelectedDebt(debt);
    setDebtForm({
      title: debt.title || '',
      amount: formatStoredInput(debt.currentBalance || 0),
      type: debt.type || 'LIABILITY',
      addToBalance: Boolean(debt.addToBalance),
      bankName: debt.bankName || '',
      interestRate: debt.interestRate > 0 ? String(debt.interestRate) : '',
    });
    setModal('edit_debt');
  };

  const openHistoryTransactionModal = (transaction) => {
    if (!transaction) return;
    markPerf('modal:history_transaction:start');
    setSelectedDebt(null);
    setSelectedTransaction(transaction);
    setModal('history_transaction');
  };

  const openTransactionEditModal = (transaction) => {
    if (!transaction || (transaction.type !== 'expense' && transaction.type !== 'income')) return;
    const nextModal = transaction.type === 'income' ? 'edit_income' : 'edit_expense';
    markPerf(`modal:${nextModal}:start`);
    setSelectedDebt(null);
    setSelectedTransaction(transaction);
    setInputValue(formatStoredInput(transaction.amount || 0));
    setSelectedSpendAccountId(
      transaction.type === 'expense' ? transaction.meta?.accountId || spendableAccounts[0]?.id || '' : '',
    );
    setTransactionCategoryForm({ preset: '', custom: transaction.category || '' });
    setModal(nextModal);
  };

  const handleAction = () => {
    const num = parseMoneyInputToMinor(inputValue);
    // Zero is a valid "available now": it is how a wrong balance is cleared.
    if (modal === 'edit_balance') {
      if (!canSubmitAction) {
        hapticError();
        return;
      }
      store.setAvailableBalance(num);
      hapticSuccess();
      closeModal();
      return;
    }
    if (num <= 0) {
      hapticError();
      return;
    }
    if (modal === 'income') store.addIncome(num, resolvedTransactionCategory);
    if (modal === 'edit_income' && selectedTransaction) {
      store.updateIncomeTransaction(
        selectedTransaction.id,
        num,
        resolvedTransactionCategory || selectedTransaction.category,
      );
    }
    if (modal === 'expense') store.addExpense(num, resolvedTransactionCategory, selectedSpendAccountId);
    if (modal === 'edit_expense' && selectedTransaction) {
      store.updateExpenseTransaction(
        selectedTransaction.id,
        num,
        resolvedTransactionCategory || selectedTransaction.category,
        selectedSpendAccountId || selectedTransaction.meta?.accountId,
      );
    }
    if (modal === 'pay_debt' && selectedDebt) store.payDebt(selectedDebt.id, num, selectedSpendAccountId);
    if (modal === 'edit_capital') store.setCapital(num);
    if (modal === 'edit_safety') store.setSafetyFund(num);
    if (modal === 'set_target_capital') store.setTargetCapital(num);
    if (modal === 'set_target_safety') store.setTargetSafety(num);
    hapticSuccess();
    closeModal();
  };

  const submitDebt = () => {
    const num = parseMoneyInputToMinor(debtForm.amount);
    const rate = parseFloat(debtForm.interestRate) || 0;
    if (!debtForm.title || num <= 0) {
      hapticError();
      return;
    }
    if (modal === 'edit_debt' && selectedDebt) {
      store.updateDebt(selectedDebt.id, { ...debtForm, amount: num, interestRate: rate });
    } else {
      if (debtForm.type === 'ASSET') {
        const source = spendableAccounts.find((item) => item.id === selectedSpendAccountId);
        if (source && num > source.balance) {
          hapticError();
          return;
        }
      }
      store.addDebt({ ...debtForm, amount: num, interestRate: rate, accountId: selectedSpendAccountId });
    }
    setDebtForm(EMPTY_DEBT_FORM);
    hapticSuccess();
    closeModal();
  };

  const deleteSelectedDebt = () => {
    if (modal !== 'edit_debt' || !selectedDebt) return;
    const isRu = store.language !== 'en';
    const confirmed =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(
            isRu
              ? 'Удалить этот долг? История платежей останется без изменений.'
              : 'Delete this debt? Your payment history stays intact.',
          )
        : true;
    if (!confirmed) return;
    store.deleteDebt(selectedDebt.id);
    setDebtForm(EMPTY_DEBT_FORM);
    hapticSuccess();
    closeModal();
  };

  return {
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
  };
}
