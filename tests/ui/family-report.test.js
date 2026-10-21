import assert from 'node:assert/strict';
import React from 'react';
import { addTest } from '../harness/runner.js';
import { baseTheme, fireEvent, loadUiModules, noop, render, resetDom, screen, softPanelStyle } from '../harness/ui.js';
import { toMinorUnits, formatMinorAsCurrency } from '../../src/utils/money.js';

// Currency strings carry non-breaking spaces; compare on digits only.
const hasAmount = (amount) => (content) =>
  content.replace(/\s/g, '') === formatMinorAsCurrency(amount, 'ru-RU', 'RUB').replace(/\s/g, '');

const fmt = (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB');

const expense = (id, amount, category, date) => ({
  id,
  type: 'expense',
  amount,
  category,
  date,
  meta: { accountId: 'a1', effects: [{ accountId: 'a1', delta: -amount }] },
});

const storeWithFamily = (overrides = {}) => ({
  availableBalance: toMinorUnits(10000),
  capital: 0,
  transactions: [
    expense('t1', toMinorUnits(40000), 'Еда', '2026-09-04T10:00:00Z'),
    expense('t2', toMinorUnits(15000), 'Авто', '2026-09-09T10:00:00Z'),
  ],
  familyMember: { id: 'm1', name: 'Аиша', senderId: 'wife', currency: 'RUB', addedAt: '2026-09-23T00:00:00Z' },
  familyReports: [
    {
      monthKey: '2026-09',
      currency: 'RUB',
      expensesTotal: toMinorUnits(33000),
      categories: [
        { category: 'Еда', amount: toMinorUnits(25000) },
        { category: 'Транспорт', amount: toMinorUnits(8000) },
      ],
      exportedAt: '2026-09-30T10:00:00Z',
      importedAt: '2026-09-30T12:00:00Z',
    },
  ],
  ...overrides,
});

const renderAnalytics = async (store) => {
  const { AnalyticsSection } = await loadUiModules();
  render(
    React.createElement(AnalyticsSection, {
      theme: baseTheme,
      store,
      isEnglish: false,
      locale: 'ru-RU',
      analyticsRange: { preset: '30d', from: '', to: '' },
      setAnalyticsRange: noop,
      report: { incomeTotal: 0, totalTrackedExpenses: toMinorUnits(55000), transactionCount: 2 },
      softPanelStyle,
      fmt,
      shareMonthlyExpenses: noop,
      familyNotice: '',
    }),
  );
};

addTest('the report screen adds a family tab that combines both sides', async () => {
  resetDom();
  await renderAnalytics(storeWithFamily());

  fireEvent.click(screen.getByText('Семья'));

  assert.ok(screen.getByText('Общий расход'));
  assert.ok(screen.getByText(hasAmount(toMinorUnits(88000))));
  assert.ok(screen.getByText(hasAmount(toMinorUnits(65000)))); // Еда: 40 000 + 25 000
  assert.ok(screen.getByText((content) => content.replace(/\s/g, '').includes('Ты40000₽·Аиша25000₽')));
  resetDom();
});

addTest('a month the partner has not shared is called out', async () => {
  resetDom();
  const store = storeWithFamily({
    transactions: [expense('t1', toMinorUnits(40000), 'Еда', '2026-08-04T10:00:00Z')],
    familyReports: [
      {
        monthKey: '2026-07',
        currency: 'RUB',
        expensesTotal: toMinorUnits(1000),
        categories: [{ category: 'Еда', amount: toMinorUnits(1000) }],
        exportedAt: '2026-07-30T10:00:00Z',
        importedAt: '2026-07-30T12:00:00Z',
      },
    ],
  });
  await renderAnalytics(store);

  fireEvent.click(screen.getByText('Семья'));
  fireEvent.click(screen.getByText('Август 2026 г.'));
  assert.ok(screen.getByText(/ещё не присылал/));
  // Only the user's own spending is in the total for that month: it shows up
  // as the total, as "mine" and as the single category.
  assert.equal(screen.getAllByText(hasAmount(toMinorUnits(40000))).length, 3);
  resetDom();
});

addTest('without a partner the report screen has no family tab', async () => {
  resetDom();
  await renderAnalytics(storeWithFamily({ familyMember: null, familyReports: [] }));
  assert.equal(screen.queryByText('Семья'), null);
  assert.ok(screen.getByText('Отправить расходы за месяц'));
  resetDom();
});
