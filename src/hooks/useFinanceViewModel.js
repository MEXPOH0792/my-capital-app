import { useMemo } from 'react';
import { syncMonthlyCoverage } from '../domain/accounts.js';
import {
  distributeIncome,
  getAdvisorInsight,
  getAllocationTotal,
  getDebtStrategies,
  getGoalJourney,
} from '../domain/finance.js';
import { toMinorUnits } from '../utils/money.js';
import { buildStorageLabels } from './finance/storageLabels.js';

export function useFinanceViewModel({ store, copy, isEnglish, locale, allocationModes, allocationForm, storageForm }) {
  const hasActiveDebts = store.debts.some((debt) => debt.type === 'LIABILITY' && debt.status === 'ACTIVE');

  const sortedDebts = useMemo(() => {
    const actives = store.debts.filter((debt) => debt.status === 'ACTIVE');
    return [...actives].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'LIABILITY' ? -1 : 1;
      return (b.interestRate || 0) - (a.interestRate || 0);
    });
  }, [store.debts]);

  const debtStrategies = useMemo(() => getDebtStrategies(store.debts), [store.debts]);
  const allocationTotal = getAllocationTotal(allocationForm);
  const currentMode = allocationModes[store.incomeDistributionMode] || allocationModes.base;
  const previewAmount = toMinorUnits(50000);
  const currentMonthlyCoverage = syncMonthlyCoverage(store.monthlyCoverage);
  const totalRequiredExpenses = useMemo(
    () => store.requiredExpenses.reduce((sum, item) => sum + item.amount, 0),
    [store.requiredExpenses],
  );
  const uncoveredRequired = Math.max(0, totalRequiredExpenses - currentMonthlyCoverage.requiredCovered);

  const previewReservedForRequired =
    store.incomeDistributionEnabled && store.incomeDistributionBasis === 'free_after_required'
      ? Math.min(previewAmount, uncoveredRequired)
      : 0;

  const previewDistribution = useMemo(
    () =>
      store.incomeDistributionEnabled
        ? distributeIncome(previewAmount - previewReservedForRequired, allocationForm)
        : { toBalance: previewAmount, toSafety: 0, toCapital: 0, toSadaka: 0 },
    [store.incomeDistributionEnabled, previewAmount, previewReservedForRequired, allocationForm],
  );

  const availableForObligations = store.incomeDistributionEnabled
    ? previewReservedForRequired + previewDistribution.toBalance
    : previewAmount;

  const obligationsDelta = availableForObligations - totalRequiredExpenses;
  const storageSplitTotal = 100;
  const payYourselfPercent = store.incomeDistributionEnabled ? allocationForm.safety + allocationForm.capital : 0;

  const totalLiabilityDebt = useMemo(
    () =>
      store.debts
        .filter((debt) => debt.type === 'LIABILITY' && debt.status === 'ACTIVE')
        .reduce((sum, debt) => sum + debt.currentBalance, 0),
    [store.debts],
  );

  const topPriorityDebt = debtStrategies.recommendedDebt;
  const safeDebtPaymentNow = Math.max(0, store.availableBalance - uncoveredRequired);
  const suggestedDebtPayment = topPriorityDebt ? Math.min(safeDebtPaymentNow, topPriorityDebt.currentBalance) : 0;

  const primaryStatus = store.incomeDistributionEnabled
    ? copy.home.primaryStatus(currentMode.label, payYourselfPercent)
    : copy.home.payYourselfOff;

  const goalJourney = useMemo(
    () => getGoalJourney(store.capital, store.targetCapital),
    [store.capital, store.targetCapital],
  );
  const progressMilestones = useMemo(
    () =>
      goalJourney.milestones.filter((point) => point <= Math.max(store.targetCapital, goalJourney.next)).slice(0, 7),
    [goalJourney, store.targetCapital],
  );

  const secondaryStatus = hasActiveDebts
    ? copy.home.activeDebtsSlowGrowth
    : store.incomeDistributionEnabled
      ? copy.home.restGoesToBalance
      : copy.home.fullIncomeToBalance;

  const advisorInsight = useMemo(
    () =>
      getAdvisorInsight({
        copy,
        locale,
        currency: store.currency,
        incomeDistributionEnabled: store.incomeDistributionEnabled,
        incomeDistributionBasis: store.incomeDistributionBasis,
        payYourselfPercent,
        totalRequiredExpenses,
        obligationsDelta,
        uncoveredRequired,
        topPriorityDebt,
        totalLiabilityDebt,
        safetyFund: store.safetyFund,
        targetSafety: store.targetSafety,
        capital: store.capital,
        targetCapital: store.targetCapital,
      }),
    [
      copy,
      locale,
      store.currency,
      store.incomeDistributionEnabled,
      store.incomeDistributionBasis,
      payYourselfPercent,
      totalRequiredExpenses,
      obligationsDelta,
      uncoveredRequired,
      topPriorityDebt,
      totalLiabilityDebt,
      store.safetyFund,
      store.targetSafety,
      store.capital,
      store.targetCapital,
    ],
  );

  const storageLabels = buildStorageLabels(isEnglish);

  const previewStorageItems = [
    { label: storageForm.liquidPrimaryName || storageLabels.primaryFallback, value: availableForObligations },
    { label: storageForm.safetyName || storageLabels.safetyFallback, value: previewDistribution.toSafety },
    { label: storageForm.capitalName || storageLabels.capitalFallback, value: previewDistribution.toCapital },
    { label: storageForm.sadakaName || storageLabels.sadakaFallback, value: previewDistribution.toSadaka },
  ];

  return {
    hasActiveDebts,
    sortedDebts,
    debtStrategies,
    allocationTotal,
    currentMode,
    previewAmount,
    totalRequiredExpenses,
    uncoveredRequired,
    previewReservedForRequired,
    previewDistribution,
    availableForObligations,
    obligationsDelta,
    storageSplitTotal,
    payYourselfPercent,
    totalLiabilityDebt,
    topPriorityDebt,
    safeDebtPaymentNow,
    suggestedDebtPayment,
    primaryStatus,
    goalJourney,
    progressMilestones,
    secondaryStatus,
    advisorInsight,
    storageLabels,
    previewStorageItems,
  };
}
