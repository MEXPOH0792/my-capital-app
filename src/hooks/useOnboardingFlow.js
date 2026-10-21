import { useMemo, useState } from 'react';
import { createId } from '../store/stateHelpers.js';
import { parseMoneyInputToMinor } from '../utils/money.js';

export function useOnboardingFlow({ store, isEnglish, formatStoredInput, storageLabels }) {
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isReconfigureMode, setIsReconfigureMode] = useState(false);
  const [balances, setBalances] = useState({
    liquidPrimary: '',
    safety: '',
    capital: '',
    sadaka: '',
  });
  const [debts, setDebts] = useState([]);
  const [requiredExpenses, setRequiredExpenses] = useState([]);
  const [targets, setTargets] = useState(() => ({
    targetSafety: formatStoredInput(store.targetSafety || 50000000),
    targetCapital: formatStoredInput(store.targetCapital || 100000000),
  }));
  const [onboardingMode, setOnboardingMode] = useState('base');

  const accountFields = useMemo(
    () => [
      {
        key: 'liquidPrimary',
        label: store.storageSetup.liquidPrimaryName || storageLabels.primaryFallback,
        protected: false,
      },
      { key: 'safety', label: store.storageSetup.safetyName || storageLabels.safetyFallback, protected: true },
      { key: 'capital', label: store.storageSetup.capitalName || storageLabels.capitalFallback, protected: true },
      {
        key: 'sadaka',
        label: store.storageSetup.sadakaName || storageLabels.sadakaFallback,
        protected: true,
        hint: storageLabels.sadakaHint,
      },
    ],
    [store.storageSetup, storageLabels],
  );

  const totalMoney = useMemo(
    () => accountFields.reduce((sum, item) => sum + parseMoneyInputToMinor(balances[item.key]), 0),
    [accountFields, balances],
  );

  const openOnboardingReconfigure = () => {
    const nextBalances = {
      liquidPrimary: formatStoredInput(store.accounts.find((item) => item.systemKey === 'liquidPrimary')?.balance || 0),
      safety: formatStoredInput(store.accounts.find((item) => item.systemKey === 'safety')?.balance || 0),
      capital: formatStoredInput(store.accounts.find((item) => item.systemKey === 'capital')?.balance || 0),
      sadaka: formatStoredInput(store.accounts.find((item) => item.systemKey === 'sadaka')?.balance || 0),
    };
    const nextDebts = store.debts
      .filter((item) => item.type === 'LIABILITY' && item.status === 'ACTIVE')
      .map((item) => ({
        id: createId(),
        title: item.title,
        amount: formatStoredInput(item.currentBalance),
        bankName: item.bankName || '',
        interestRate: String(item.interestRate || ''),
      }));
    const nextRequiredExpenses = store.requiredExpenses.map((item) => ({
      id: createId(),
      title: item.title,
      amount: formatStoredInput(item.amount),
    }));

    setBalances(nextBalances);
    setDebts(nextDebts);
    setRequiredExpenses(nextRequiredExpenses);
    setTargets({
      targetSafety: formatStoredInput(store.targetSafety),
      targetCapital: formatStoredInput(store.targetCapital),
    });
    setOnboardingMode(store.incomeDistributionMode === 'custom' ? 'base' : store.incomeDistributionMode);
    setOnboardingStep(0);
    setIsReconfigureMode(true);
  };

  const submitOnboarding = () => {
    if (isReconfigureMode && store.transactions.length > 0) {
      const confirmed = window.confirm(
        isEnglish
          ? 'This will replace your starting base and clear current operation history. Continue?'
          : 'Это заменит стартовую базу и очистит текущую историю операций. Продолжить?',
      );
      if (!confirmed) return;
    }

    const nextBalances = accountFields.reduce((acc, item) => {
      acc[item.key] = parseMoneyInputToMinor(balances[item.key]);
      return acc;
    }, {});
    const nextDebts = debts
      .map((item) => ({
        title: item.title,
        amount: parseMoneyInputToMinor(item.amount),
        bankName: item.bankName,
        interestRate: parseFloat(String(item.interestRate).replace(',', '.')) || 0,
      }))
      .filter((item) => item.amount > 0);
    const nextRequiredExpenses = requiredExpenses
      .map((item) => ({
        title: item.title,
        amount: parseMoneyInputToMinor(item.amount),
      }))
      .filter((item) => item.amount > 0);

    store.completeOnboarding({
      startingBalances: nextBalances,
      debts: nextDebts,
      requiredExpenses: nextRequiredExpenses,
      targetSafety: parseMoneyInputToMinor(targets.targetSafety) || store.targetSafety,
      targetCapital: parseMoneyInputToMinor(targets.targetCapital) || store.targetCapital,
      incomeDistributionMode: onboardingMode,
    });
    setOnboardingStep(0);
    setIsReconfigureMode(false);
  };

  const addDebt = () => {
    setDebts((prev) => [...prev, { id: createId(), title: '', amount: '', bankName: '', interestRate: '' }]);
  };

  const updateDebt = (id, key, value) => {
    setDebts((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeDebt = (id) => {
    setDebts((prev) => prev.filter((item) => item.id !== id));
  };

  const addRequiredExpense = () => {
    setRequiredExpenses((prev) => [...prev, { id: createId(), title: '', amount: '' }]);
  };

  const updateRequiredExpense = (id, key, value) => {
    setRequiredExpenses((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeRequiredExpense = (id) => {
    setRequiredExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const exitReconfigure = () => {
    setIsReconfigureMode(false);
    setOnboardingStep(0);
  };

  return {
    onboardingStep,
    setOnboardingStep,
    isReconfigureMode,
    balances,
    setBalances,
    debts,
    addDebt,
    updateDebt,
    removeDebt,
    requiredExpenses,
    addRequiredExpense,
    updateRequiredExpense,
    removeRequiredExpense,
    targets,
    setTargets,
    onboardingMode,
    setOnboardingMode,
    accountFields,
    totalMoney,
    openOnboardingReconfigure,
    submitOnboarding,
    exitReconfigure,
  };
}
