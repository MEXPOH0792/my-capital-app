import { useMemo } from 'react';
import { isReportedExpense } from '../../domain/history.js';
import { forecastLimit, getActiveCategoryPresets, getMonthlySpendByCategory } from '../../domain/finance.js';
import { getOtherSpendableTotal } from '../../store/stateHelpers.js';
import { isAmountTooLarge, parseMoneyInputToMinor } from '../../utils/money.js';

/**
 * Forecast for the chosen category's monthly limit. Kept out of the hook body
 * so the clock read stays outside render.
 */
function buildLimitForecast(transactions, categoryLimits, category, pendingAmount) {
  const trackedExpenses = transactions.filter(isReportedExpense);
  const spend = getMonthlySpendByCategory(trackedExpenses, Date.now());
  return forecastLimit(categoryLimits, spend, category, pendingAmount);
}

export function useModalComputed({
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
}) {
  const activeTransactionCategoryPresets = useMemo(() => {
    if (modal === 'income' || modal === 'edit_income') {
      return getActiveCategoryPresets({
        language: store.language,
        type: 'income',
        transactions: store.transactions,
        hiddenPresets: store.hiddenIncomePresets?.[store.language] || [],
        copy,
      });
    }

    if (modal === 'expense' || modal === 'edit_expense') {
      return getActiveCategoryPresets({
        language: store.language,
        type: 'expense',
        transactions: store.transactions,
        hiddenPresets: store.hiddenExpensePresets?.[store.language] || [],
        copy,
      });
    }

    return [];
  }, [modal, store.hiddenExpensePresets, store.hiddenIncomePresets, store.language, store.transactions, copy]);

  const resolvedTransactionCategory = useMemo(() => {
    const custom = transactionCategoryForm.custom.trim();
    return custom || transactionCategoryForm.preset || '';
  }, [transactionCategoryForm]);

  // What this expense would do to the category's monthly ceiling. Computed
  // while the user is still deciding, not after the money is gone.
  const limitForecast = useMemo(() => {
    if (modal !== 'expense' && modal !== 'edit_expense') return null;
    if (!resolvedTransactionCategory) return null;

    return buildLimitForecast(
      store.transactions,
      store.categoryLimits || [],
      resolvedTransactionCategory,
      parseMoneyInputToMinor(inputValue),
    );
  }, [modal, resolvedTransactionCategory, store.transactions, store.categoryLimits, inputValue]);

  const modalNumericValue = parseMoneyInputToMinor(inputValue);
  // "Available now" is the sum of every spendable account; the main account
  // absorbs the change, so the target cannot go below the other cards.
  const otherSpendableTotal = getOtherSpendableTotal(store.accounts);
  const hasAmountInput = String(inputValue ?? '').trim() !== '';
  const modalHelperCopy = copy.modalHelper;
  const isTooLarge = isAmountTooLarge(modalNumericValue);
  const isModalAmountValid = modalNumericValue > 0 && !isTooLarge;
  const selectedSpendAccount = spendableAccounts.find((item) => item.id === selectedSpendAccountId);
  const restoredAvailableBalance =
    modal === 'edit_expense' ? store.availableBalance + (selectedTransaction?.amount || 0) : store.availableBalance;
  const restoredSpendAccountBalance =
    modal === 'edit_expense'
      ? (selectedSpendAccount?.balance || 0) +
        (selectedTransaction?.meta?.accountId === selectedSpendAccountId ? selectedTransaction?.amount || 0 : 0)
      : selectedSpendAccount?.balance || 0;

  const canSubmitAction = (() => {
    if (modal === 'income' || modal === 'edit_income') return isModalAmountValid;

    if (modal === 'expense' || modal === 'edit_expense') {
      return (
        isModalAmountValid &&
        modalNumericValue <= restoredAvailableBalance &&
        modalNumericValue <= restoredSpendAccountBalance
      );
    }

    if (modal === 'pay_debt') {
      if (!selectedDebt || !isModalAmountValid) return false;
      const spendAccount = spendableAccounts.find((item) => item.id === selectedSpendAccountId);
      if (selectedDebt.type === 'LIABILITY' && modalNumericValue > store.availableBalance) return false;
      if (selectedDebt.type === 'LIABILITY' && modalNumericValue > (spendAccount?.balance || 0)) return false;
      return modalNumericValue <= selectedDebt.currentBalance;
    }

    if (modal === 'edit_balance') {
      return hasAmountInput && !isTooLarge && modalNumericValue >= otherSpendableTotal;
    }

    if (
      modal === 'edit_capital' ||
      modal === 'edit_safety' ||
      modal === 'set_target_capital' ||
      modal === 'set_target_safety'
    ) {
      return isModalAmountValid;
    }

    return true;
  })();

  const modalHelperText = (() => {
    if (isTooLarge) return isEnglish ? 'Amount is too large.' : 'Слишком большая сумма.';
    if (modal === 'income' || modal === 'edit_income') {
      return isModalAmountValid
        ? isEnglish
          ? 'Category is optional.'
          : 'Категория не обязательна.'
        : isEnglish
          ? 'Enter a valid amount.'
          : 'Введи корректную сумму.';
    }

    if (modal === 'expense' || modal === 'edit_expense') {
      if (!isModalAmountValid) return modalHelperCopy.expenseInvalid;
      if (modalNumericValue > restoredAvailableBalance) return modalHelperCopy.expenseAboveBalance;
      if (!selectedSpendAccount) return modalHelperCopy.chooseSpendAccount;
      if (modalNumericValue > restoredSpendAccountBalance) return modalHelperCopy.accountLacksMoney;
      return resolvedTransactionCategory
        ? modalHelperCopy.categoryPrefix(resolvedTransactionCategory)
        : modalHelperCopy.addCategoryForLeaks;
    }

    if (modal === 'pay_debt') {
      const spendAccount = spendableAccounts.find((item) => item.id === selectedSpendAccountId);
      if (!selectedDebt) return modalHelperCopy.chooseDebt;
      if (!isModalAmountValid) return modalHelperCopy.paymentInvalid;
      if (!spendAccount && selectedDebt.type === 'LIABILITY') return modalHelperCopy.chooseSpendAccount;
      if (selectedDebt.type === 'LIABILITY' && modalNumericValue > store.availableBalance)
        return modalHelperCopy.paymentFreeBalance;
      if (selectedDebt.type === 'LIABILITY' && modalNumericValue > (spendAccount?.balance || 0))
        return modalHelperCopy.accountLacksMoney;
      if (modalNumericValue > selectedDebt.currentBalance) return modalHelperCopy.paymentAboveDebt;
      return modalHelperCopy.debtBalance(fmt(selectedDebt.currentBalance));
    }

    if (modal === 'edit_balance') {
      if (!hasAmountInput) return modalHelperCopy.genericInvalid;
      if (modalNumericValue < otherSpendableTotal) {
        return isEnglish
          ? `Other cards already hold ${fmt(otherSpendableTotal)}. Correct them on the Accounts screen.`
          : `На других картах уже ${fmt(otherSpendableTotal)}. Поправь их на экране «Счета».`;
      }
      if (otherSpendableTotal > 0) {
        return isEnglish
          ? `Main account becomes ${fmt(modalNumericValue - otherSpendableTotal)}.`
          : `Основной счёт станет ${fmt(modalNumericValue - otherSpendableTotal)}.`;
      }
      return '';
    }

    if (!isModalAmountValid) return modalHelperCopy.genericInvalid;
    return '';
  })();

  return {
    activeTransactionCategoryPresets,
    resolvedTransactionCategory,
    limitForecast,
    isModalAmountValid,
    modalHelperText,
    canSubmitAction,
  };
}
