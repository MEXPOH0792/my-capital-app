import { useState } from 'react';

const EMPTY_DEBT_FORM = {
  title: '',
  amount: '',
  type: 'LIABILITY',
  addToBalance: true,
  bankName: '',
  interestRate: '',
};
const EMPTY_CATEGORY_FORM = { preset: '', custom: '', appearance: '' };

export function useModalState({ modal, spendableAccounts }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [debtForm, setDebtForm] = useState(EMPTY_DEBT_FORM);
  const [transactionCategoryForm, setTransactionCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [selectedSpendAccountId, setSelectedSpendAccountId] = useState('');

  // Clear the form as the modal closes. Adjusting state during render is
  // React's documented alternative to a reset effect — it re-renders before
  // committing, so stale values are never painted.
  const [lastModal, setLastModal] = useState(modal);
  if (modal !== lastModal) {
    setLastModal(modal);
    if (!modal) {
      setTransactionCategoryForm(EMPTY_CATEGORY_FORM);
      setInputValue('');
      setSelectedDebt(null);
      setSelectedTransaction(null);
    }
  }

  // The default spend account is derived, not stored: writing it into state
  // from an effect only duplicated what the accounts list already says.
  const needsSpendAccount = modal === 'expense' || modal === 'pay_debt';
  const fallbackSpendAccountId = (spendableAccounts.find((item) => item.isPrimary) || spendableAccounts[0])?.id || '';
  const effectiveSpendAccountId = selectedSpendAccountId || (needsSpendAccount ? fallbackSpendAccountId : '');

  return {
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
    selectedSpendAccountId: effectiveSpendAccountId,
    setSelectedSpendAccountId,
    resetModalState: () => {
      setInputValue('');
      setTransactionCategoryForm(EMPTY_CATEGORY_FORM);
      setSelectedSpendAccountId('');
      setSelectedDebt(null);
      setSelectedTransaction(null);
    },
    resetDebtForm: () => setDebtForm(EMPTY_DEBT_FORM),
  };
}
