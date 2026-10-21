import { useDeferredValue, useMemo } from 'react';
import {
  aggregateExpensesByAccount,
  aggregateTransactionsByCategory,
  getBiggestExpenseRise,
  getGoalJourney,
  getGoalPace,
  getMetricDelta,
  getMonthlySeries,
  getMonthlyTrend,
  getPeriodSummary,
} from '../domain/finance.js';
import { isReportedExpense, isReportedIncome, isSadakaSetAside } from '../domain/history.js';
import { getTransactionRelatedAccountIds } from '../store/stateHelpers.js';

function getPresetStartDate(preset) {
  const now = new Date();

  switch (preset) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed runway for the trend chart, independent of the selected period. */
const MONTHLY_CHART_MONTHS = 6;

/**
 * Length of the analysed window in days, used to normalise the saving pace to a
 * month. Returns 0 when the window cannot be determined (no data yet, or a
 * custom range without a start date), which disables the forecast downstream.
 */
function getPeriodDays(analyticsRange, analyticsTransactions) {
  const now = Date.now();

  if (analyticsRange.preset === '30d') return 30;
  if (analyticsRange.preset === '90d') return 90;

  if (analyticsRange.preset === 'custom') {
    if (!analyticsRange.from) return 0;
    const start = new Date(`${analyticsRange.from}T00:00:00.000`).getTime();
    const end = analyticsRange.to ? new Date(`${analyticsRange.to}T23:59:59.999`).getTime() : now;
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
    return Math.max(1, Math.round((end - start) / DAY_MS));
  }

  // "All time" spans from the oldest recorded transaction up to now.
  let oldest = null;
  analyticsTransactions.forEach((item) => {
    const time = new Date(item.date).getTime();
    if (Number.isNaN(time)) return;
    if (oldest === null || time < oldest) oldest = time;
  });
  if (oldest === null) return 0;
  return Math.max(1, Math.round((now - oldest) / DAY_MS));
}

/**
 * The window of the same length immediately before the analysed one. Returns
 * null when there is nothing sensible to compare against: "all time" has no
 * "before", and a custom range without a start date has no length.
 */
function getPreviousWindow(analyticsRange) {
  const now = Date.now();

  if (analyticsRange.preset === '30d' || analyticsRange.preset === '90d') {
    const days = analyticsRange.preset === '30d' ? 30 : 90;
    const start = now - days * DAY_MS;
    return { start: start - days * DAY_MS, end: start };
  }

  if (analyticsRange.preset === 'custom') {
    if (!analyticsRange.from) return null;
    const start = new Date(`${analyticsRange.from}T00:00:00.000`).getTime();
    const end = analyticsRange.to ? new Date(`${analyticsRange.to}T23:59:59.999`).getTime() : now;
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const length = end - start;
    return { start: start - length, end: start };
  }

  return null;
}

/**
 * Monthly income/expense columns plus a trend verdict. Kept out of the hook
 * body so the clock read stays outside render.
 */
function buildMonthly(transactions) {
  const income = [];
  const expenses = [];

  transactions.forEach((item) => {
    if (isReportedIncome(item)) income.push(item);
    else if (isReportedExpense(item)) expenses.push(item);
  });

  const series = getMonthlySeries(income, expenses, MONTHLY_CHART_MONTHS, Date.now());
  return { series, trend: getMonthlyTrend(series) };
}

export function useHistoryAnalyticsViewModel({
  store,
  isEnglish,
  activeTab,
  analyticsRange,
  historyFilter,
  historyQuery,
  selectedAccountActivityId,
}) {
  const analyticsActive = activeTab === 'analytics';
  const historyActive = activeTab === 'history';
  const accountsActive = activeTab === 'accounts';
  const deferredHistoryQuery = useDeferredValue(historyQuery);

  const analyticsTransactions = useMemo(() => {
    if (!analyticsActive) return [];

    const presetStart = getPresetStartDate(analyticsRange.preset);
    const customStart = analyticsRange.from ? new Date(`${analyticsRange.from}T00:00:00.000`) : null;
    const customEnd = analyticsRange.to ? new Date(`${analyticsRange.to}T23:59:59.999`) : null;

    return store.transactions.filter((item) => {
      const itemDate = new Date(item.date);
      if (Number.isNaN(itemDate.getTime())) return false;

      if (analyticsRange.preset === 'custom') {
        if (customStart && itemDate < customStart) return false;
        if (customEnd && itemDate > customEnd) return false;
        return true;
      }

      if (presetStart && itemDate < presetStart) return false;
      return true;
    });
  }, [analyticsActive, analyticsRange, store.transactions]);

  const analyticsTrackedExpenses = useMemo(
    () => (analyticsActive ? analyticsTransactions.filter(isReportedExpense) : []),
    [analyticsActive, analyticsTransactions],
  );

  const uncategorizedLabel = isEnglish ? 'Uncategorized' : 'Без категории';
  const unassignedAccountLabel = isEnglish ? 'No account' : 'Без счёта';

  const expenseCategories = useMemo(
    () => (analyticsActive ? aggregateTransactionsByCategory(analyticsTrackedExpenses, uncategorizedLabel) : []),
    [analyticsActive, analyticsTrackedExpenses, uncategorizedLabel],
  );

  const incomeCategories = useMemo(
    () =>
      analyticsActive
        ? aggregateTransactionsByCategory(analyticsTransactions.filter(isReportedIncome), uncategorizedLabel)
        : [],
    [analyticsActive, analyticsTransactions, uncategorizedLabel],
  );

  const accountSpending = useMemo(
    () => (analyticsActive ? aggregateExpensesByAccount(analyticsTrackedExpenses, unassignedAccountLabel) : []),
    [analyticsActive, analyticsTrackedExpenses, unassignedAccountLabel],
  );

  const totalTrackedExpenses = analyticsTrackedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const analyticsIncomeTotal = analyticsTransactions
    .filter(isReportedIncome)
    .reduce((sum, item) => sum + item.amount, 0);
  const analyticsTransactionCount = analyticsTransactions.length;
  const sadakaSetAside = analyticsTransactions.filter(isSadakaSetAside).reduce((sum, item) => sum + item.amount, 0);

  const analyticsPeriodDays = useMemo(
    () => (analyticsActive ? getPeriodDays(analyticsRange, analyticsTransactions) : 0),
    [analyticsActive, analyticsRange, analyticsTransactions],
  );

  const periodSummary = useMemo(
    () => getPeriodSummary(analyticsIncomeTotal, totalTrackedExpenses),
    [analyticsIncomeTotal, totalTrackedExpenses],
  );

  const goalPace = useMemo(() => {
    const { remainingToTarget } = getGoalJourney(store.capital, store.targetCapital);
    return getGoalPace(periodSummary.saved, analyticsPeriodDays, remainingToTarget);
  }, [periodSummary.saved, analyticsPeriodDays, store.capital, store.targetCapital]);

  // Same-length window immediately before the analysed one. null means "do not
  // show comparisons at all" — either the range has no meaningful predecessor
  // or nothing was recorded back then.
  const periodComparison = useMemo(() => {
    if (!analyticsActive) return null;
    const window = getPreviousWindow(analyticsRange);
    if (!window) return null;

    const previous = store.transactions.filter((item) => {
      const time = new Date(item.date).getTime();
      if (Number.isNaN(time)) return false;
      return time >= window.start && time < window.end;
    });
    if (previous.length === 0) return null;

    const previousIncome = previous.filter(isReportedIncome).reduce((sum, item) => sum + item.amount, 0);
    const previousExpenseTransactions = previous.filter(isReportedExpense);
    const previousExpenses = previousExpenseTransactions.reduce((sum, item) => sum + item.amount, 0);

    return {
      income: getMetricDelta(analyticsIncomeTotal, previousIncome),
      expenses: getMetricDelta(totalTrackedExpenses, previousExpenses),
      saved: getMetricDelta(analyticsIncomeTotal - totalTrackedExpenses, previousIncome - previousExpenses),
      biggestRise: getBiggestExpenseRise(
        expenseCategories,
        aggregateTransactionsByCategory(previousExpenseTransactions, uncategorizedLabel),
      ),
    };
  }, [
    analyticsActive,
    analyticsRange,
    store.transactions,
    uncategorizedLabel,
    analyticsIncomeTotal,
    totalTrackedExpenses,
    expenseCategories,
  ]);

  // The monthly chart deliberately ignores the selected period: a trend needs a
  // fixed runway, otherwise switching to "30 days" would leave a single column.
  const monthly = useMemo(
    () => (analyticsActive ? buildMonthly(store.transactions) : null),
    [analyticsActive, store.transactions],
  );

  const transferTransactions = useMemo(
    () => (accountsActive || historyActive ? store.transactions.filter((item) => item.type === 'transfer') : []),
    [accountsActive, historyActive, store.transactions],
  );

  const selectedAccount = useMemo(
    () =>
      accountsActive
        ? store.accounts.find((item) => item.id === selectedAccountActivityId) ||
          store.accounts.find((item) => item.isPrimary) ||
          store.accounts[0] ||
          null
        : null,
    [accountsActive, store.accounts, selectedAccountActivityId],
  );

  const accountActivityTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return store.transactions.filter((item) => {
      const relatedAccountIds = getTransactionRelatedAccountIds(item);
      return relatedAccountIds.includes(selectedAccount.id);
    });
  }, [selectedAccount, store.transactions]);

  const historyFilterItems = useMemo(
    () => [
      { key: 'all', label: isEnglish ? 'All' : 'Все' },
      { key: 'income', label: isEnglish ? 'Income' : 'Доходы' },
      { key: 'expense', label: isEnglish ? 'Expenses' : 'Расходы' },
      { key: 'transfer', label: isEnglish ? 'Transfers' : 'Переводы' },
    ],
    [isEnglish],
  );

  const filteredHistory = useMemo(() => {
    if (!historyActive) return [];

    const query = deferredHistoryQuery.trim().toLowerCase();
    return store.transactions.filter((item) => {
      if (historyFilter !== 'all' && item.type !== historyFilter) return false;
      if (!query) return true;

      const haystacks = [
        String(item.category || ''),
        String(item.meta?.accountName || ''),
        String(item.meta?.fromAccountName || ''),
        String(item.meta?.toAccountName || ''),
      ];

      return haystacks.some((value) => value.toLowerCase().includes(query));
    });
  }, [historyActive, store.transactions, historyFilter, deferredHistoryQuery]);

  const topExpenseCategory = expenseCategories[0] || null;
  const topExpenseShare =
    totalTrackedExpenses > 0 && topExpenseCategory
      ? Math.round((topExpenseCategory.amount / totalTrackedExpenses) * 100)
      : 0;
  const topThreeExpenseShare = expenseCategories.slice(0, 3).reduce((sum, item) => sum + item.amount, 0);

  const expenseHeadline = topExpenseCategory
    ? isEnglish
      ? `${topExpenseCategory.category} takes ${topExpenseShare}% of tracked expenses.`
      : `${topExpenseCategory.category} съедает ${topExpenseShare}% отслеживаемых расходов.`
    : '';

  const expenseInsight =
    topExpenseShare >= 40
      ? isEnglish
        ? 'This is your main cash leak. Cut or cap this category first.'
        : 'Это главный пожиратель денег. Сначала режь или ограничивай именно эту категорию.'
      : topThreeExpenseShare >= totalTrackedExpenses * 0.8
        ? isEnglish
          ? 'Most spending is concentrated in a few categories. You can control them directly.'
          : 'Большая часть трат сидит в нескольких категориях. Ими можно управлять напрямую.'
        : isEnglish
          ? 'Spending is spread out. Look at frequency, not one giant category.'
          : 'Траты размазаны. Смотри не на одну дыру, а на повторяемость мелких расходов.';

  // Everything the report screen needs travels as one object. These values are
  // used nowhere else, and threading them individually meant touching five
  // files for every new figure.
  const report = {
    incomeTotal: analyticsIncomeTotal,
    transactionCount: analyticsTransactionCount,
    totalTrackedExpenses,
    sadakaSetAside,
    periodDays: analyticsPeriodDays,
    expenseCategories,
    incomeCategories,
    accountSpending,
    topExpenseCategory,
    topExpenseShare,
    expenseHeadline,
    expenseInsight,
    periodSummary,
    periodComparison,
    monthly,
    goalPace,
  };

  return {
    report,
    transferTransactions,
    selectedAccount,
    accountActivityTransactions,
    historyFilterItems,
    filteredHistory,
  };
}
