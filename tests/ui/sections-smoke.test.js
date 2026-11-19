import assert from 'node:assert/strict';
import React from 'react';
import { addTest } from '../harness/runner.js';
import {
  baseTheme,
  fireEvent,
  loadUiModules,
  noop,
  panelStyle,
  render,
  renderHtml,
  resetDom,
  screen,
  softPanelStyle,
} from '../harness/ui.js';
import { getCopy } from '../../src/i18n.js';
import { formatMinorAsCurrency, toMinorUnits } from '../../src/utils/money.js';

addTest('HistorySection renders large history in batches and expands on demand', async () => {
  resetDom();
  const { HistorySection } = await loadUiModules();
  const copy = getCopy('en');
  const filteredHistory = Array.from({ length: 120 }, (_, index) => ({
    id: `tx-${index + 1}`,
    type: index % 3 === 0 ? 'income' : index % 3 === 1 ? 'expense' : 'transfer',
    category: `Entry ${index + 1}`,
    amount: toMinorUnits(index + 1),
    date: new Date(2026, 0, (index % 28) + 1).toISOString(),
    meta: {},
  }));

  render(
    React.createElement(HistorySection, {
      copy,
      isEnglish: true,
      historyFilterItems: [{ key: 'all', label: 'All' }],
      historyFilter: 'all',
      setHistoryFilter: noop,
      historyQuery: '',
      setHistoryQuery: noop,
      softPanelStyle,
      filteredHistory,
      theme: baseTheme,
      locale: 'en-US',
      fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
      canDeleteTransaction: () => false,
      deleteTransaction: noop,
    }),
  );

  assert.ok(screen.getByText('40 of 120 entries'));
  fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
  assert.ok(screen.getByText('80 of 120 entries'));
  resetDom();
});

addTest('AnalyticsSection smoke renders report period controls', async () => {
  resetDom();
  const { AnalyticsSection } = await loadUiModules();
  const copy = getCopy('ru');

  render(
    React.createElement(AnalyticsSection, {
      copy,
      theme: baseTheme,
      store: {
        availableBalance: toMinorUnits(50000),
        capital: toMinorUnits(120000),
        safetyFund: toMinorUnits(40000),
        isDarkMode: true,
      },
      isEnglish: false,
      analyticsRange: { preset: '30d', from: '', to: '' },
      setAnalyticsRange: noop,
      report: {
        incomeTotal: toMinorUnits(80000),
        transactionCount: 12,
        totalTrackedExpenses: toMinorUnits(33000),
        topExpenseCategory: { category: 'Продукты', amount: toMinorUnits(15000) },
        topExpenseShare: 45,
        expenseHeadline: 'Продукты съедают 45% отслеживаемых расходов.',
        expenseInsight: 'Это главный пожиратель денег.',
        expenseCategories: [
          { category: 'Продукты', amount: toMinorUnits(15000) },
          { category: 'Кафе', amount: toMinorUnits(8000) },
        ],
        incomeCategories: [{ category: 'Зарплата', amount: toMinorUnits(80000) }],
        accountSpending: [{ category: 'Карта', amount: toMinorUnits(33000) }],
        periodSummary: {
          income: toMinorUnits(80000),
          expenses: toMinorUnits(33000),
          saved: toMinorUnits(47000),
          savingsRate: 59,
          tone: 'strong',
        },
        goalPace: { monthlySaving: toMinorUnits(47000), monthsToGoal: 7 },
        monthly: {
          series: [
            { key: '2026-03', year: 2026, month: 2, income: toMinorUnits(70000), expenses: toMinorUnits(28000) },
            { key: '2026-04', year: 2026, month: 3, income: toMinorUnits(75000), expenses: toMinorUnits(30000) },
            { key: '2026-05', year: 2026, month: 4, income: toMinorUnits(80000), expenses: toMinorUnits(33000) },
          ],
          trend: { kind: 'expenses-rising', streak: 2 },
        },
        periodComparison: {
          income: { current: 0, previous: 0, absolute: 0, percent: 12, direction: 'up' },
          expenses: { current: 0, previous: 0, absolute: 0, percent: 8, direction: 'up' },
          saved: { current: 0, previous: 0, absolute: 0, percent: 3, direction: 'down' },
          biggestRise: {
            category: 'Кафе',
            current: toMinorUnits(8000),
            previous: toMinorUnits(5000),
            absolute: toMinorUnits(3000),
            percent: 60,
            direction: 'up',
          },
        },
      },
      softPanelStyle,
      fmt: (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB'),
    }),
  );

  assert.ok(screen.getByText('Что важно сейчас'));
  assert.ok(screen.getByText('30 дней'));
  // Savings block leads the report and carries a verdict, not just a number.
  assert.ok(screen.getByText('Сохранено за период'));
  assert.ok(screen.getByText('59%'));
  assert.ok(screen.getByText('Сильный темп. Можно поднимать цель.'));
  // Category structure renders every tracked category with its share.
  assert.ok(screen.getByText('Структура'));
  assert.ok(screen.getByText('Кафе'));
  // "Доходы" now labels both a context metric and the breakdown toggle.
  assert.equal(screen.getAllByText('Доходы').length, 2);
  // Comparison against the previous window: growth badges plus the riser note.
  assert.ok(screen.getByText('↑ 12%'));
  assert.ok(screen.getByText('↓ 3%'));
  assert.ok(screen.getByText(/Сильнее всего выросла категория «Кафе»: \+60%/));
  // Monthly trend chart with its verdict in words.
  assert.ok(screen.getByText('Последние 6 месяцев'));
  assert.ok(screen.getByText('Расходы растут 3 месяца подряд.'));
  // Spending can also be sliced by account, and the whole report is shareable.
  assert.ok(screen.getByText('Счета'));
  assert.ok(screen.getByText('Поделиться отчётом'));
  resetDom();
});

addTest('HomeSection smoke keeps the product focused on action, tree and growth', async () => {
  const { HomeSection } = await loadUiModules();
  const copy = getCopy('ru');
  const html = renderHtml(
    React.createElement(HomeSection, {
      copy,
      store: {
        availableBalance: toMinorUnits(45000),
        incomeDistributionEnabled: true,
        allocationPercents: { balance: 85, safety: 8, capital: 6, sadaka: 1 },
        capital: toMinorUnits(120000),
        targetCapital: toMinorUnits(1000000),
      },
      panelStyle,
      theme: baseTheme,
      fmt: (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB'),
      onEditBalance: noop,
      primaryStatus: 'Сначала себе, потом траты.',
      secondaryStatus: 'Свободные деньги уже отделены от роста.',
      hasActiveDebts: false,
      advisorInsight: {
        title: 'Следующий шаг',
        description: 'Закрой обязательный минимум и не трогай капитал.',
      },
      previewCapitalGain: toMinorUnits(5000),
      progressMilestones: [],
      goalJourney: { next: toMinorUnits(250000), progressPercent: 48, remainingToNext: toMinorUnits(130000) },
      locale: 'ru-RU',
      onOpenIncome: noop,
      onOpenExpense: noop,
    }),
  );

  assert.ok(html.includes(copy.home.availableBalance));
  assert.match(html, /Следующий шаг/);
  assert.match(html, /Доход/);
  assert.match(html, /Расход/);
});

addTest('DebtsSection smoke keeps debt guidance as a primary product action', async () => {
  const { DebtsSection } = await loadUiModules();
  const copy = getCopy('ru');
  const debt1 = {
    id: 'loan-1',
    type: 'LIABILITY',
    status: 'ACTIVE',
    currentBalance: toMinorUnits(90000),
    title: 'Кредитка',
    interestRate: 29,
  };
  const debt2 = {
    id: 'loan-2',
    type: 'LIABILITY',
    status: 'ACTIVE',
    currentBalance: toMinorUnits(30000),
    title: 'Займ',
    interestRate: 12,
  };

  const html = renderHtml(
    React.createElement(DebtsSection, {
      copy,
      theme: baseTheme,
      fmt: (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB'),
      isEnglish: false,
      debtStrategies: {
        recommendedDebt: debt1,
        avalancheDebt: debt1,
        snowballDebt: debt2,
        recommendationType: 'avalanche',
        why: 'Сначала гасим самый дорогой долг.',
      },
      uncoveredRequired: 0,
      safeDebtPaymentNow: toMinorUnits(5000),
      suggestedDebtPayment: toMinorUnits(12000),
      onUseSuggestedPayment: noop,
      store: { debts: [debt1, debt2] },
      sortedDebts: [debt1, debt2],
      onOpenNewDebt: noop,
      onPayDebt: noop,
    }),
  );

  assert.match(html, /Долги/);
  assert.match(html, /Кредитка/);
});
