import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  getPeriodSummary,
  getGoalPace,
  getMetricDelta,
  getBiggestExpenseRise,
  getMonthlySeries,
  getMonthlyTrend,
  aggregateExpensesByAccount,
  buildReportText,
} from '../../src/domain/finance.js';

addTest('period summary keeps the savings rate and rates the pace', () => {
  const summary = getPeriodSummary(100000, 75000);

  assert.equal(summary.saved, 25000);
  assert.equal(summary.savingsRate, 25);
  assert.equal(summary.tone, 'strong');
});

addTest('period summary without income does not invent a savings rate', () => {
  const summary = getPeriodSummary(0, 5000);

  assert.equal(summary.savingsRate, null);
  assert.equal(summary.tone, null);
  assert.equal(summary.saved, -5000);
});

addTest('period summary flags a loss-making period', () => {
  const summary = getPeriodSummary(50000, 80000);

  assert.equal(summary.saved, -30000);
  assert.equal(summary.tone, 'negative');
  assert.ok(summary.savingsRate < 0);
});

addTest('period summary tone bands switch at 10% and 20%', () => {
  assert.equal(getPeriodSummary(100000, 95000).tone, 'thin'); // 5%
  assert.equal(getPeriodSummary(100000, 90000).tone, 'working'); // 10%
  assert.equal(getPeriodSummary(100000, 81000).tone, 'working'); // 19%
  assert.equal(getPeriodSummary(100000, 80000).tone, 'strong'); // 20%
});

addTest('goal pace forecasts months at the current saving rate', () => {
  // 30000 kept over 30 days is 30000 per month; 120000 left means 4 months.
  const pace = getGoalPace(30000, 30, 120000);

  assert.equal(pace.monthlySaving, 30000);
  assert.equal(pace.monthsToGoal, 4);
});

addTest('goal pace refuses to forecast without a usable pace', () => {
  assert.equal(getGoalPace(30000, 0, 120000).monthsToGoal, null, 'unknown period length');
  assert.equal(getGoalPace(0, 30, 120000).monthsToGoal, null, 'nothing kept');
  assert.equal(getGoalPace(-5000, 30, 120000).monthsToGoal, null, 'period at a loss');
  assert.equal(getGoalPace(30000, 30, 0).monthsToGoal, null, 'goal already reached');
});

addTest('goal pace drops forecasts beyond a useful horizon', () => {
  // 100 per month against a huge remaining target is noise, not information.
  assert.equal(getGoalPace(100, 30, 100000000).monthsToGoal, null);
});

addTest('goal pace keeps precision for small daily amounts', () => {
  // Regression: rounding the daily figure before scaling to a month collapsed
  // any pace below one unit per day to zero.
  const pace = getGoalPace(1500, 90, 60000);

  assert.equal(pace.monthlySaving, 500);
  assert.equal(pace.monthsToGoal, 120);
});

addTest('metric delta reports direction and percentage against the previous window', () => {
  const grew = getMetricDelta(120000, 100000);
  assert.equal(grew.percent, 20);
  assert.equal(grew.direction, 'up');
  assert.equal(grew.absolute, 20000);

  const shrank = getMetricDelta(80000, 100000);
  assert.equal(shrank.percent, -20);
  assert.equal(shrank.direction, 'down');
});

addTest('metric delta never divides by a zero base', () => {
  const appeared = getMetricDelta(5000, 0);
  assert.equal(appeared.percent, null, 'no percentage without a base');
  assert.equal(appeared.direction, 'new');
  assert.equal(appeared.absolute, 5000);

  const empty = getMetricDelta(0, 0);
  assert.equal(empty.percent, null);
  assert.equal(empty.direction, 'none');
});

addTest('metric delta treats an unchanged figure as flat', () => {
  const same = getMetricDelta(100000, 100000);
  assert.equal(same.percent, 0);
  assert.equal(same.direction, 'flat');
});

addTest('metric delta handles a category dropping to zero', () => {
  const gone = getMetricDelta(0, 40000);
  assert.equal(gone.percent, -100);
  assert.equal(gone.direction, 'down');
});

addTest('biggest riser is chosen by absolute money, not percentage', () => {
  const rise = getBiggestExpenseRise(
    [
      { category: 'Кафе', amount: 30000 },
      { category: 'Мелочь', amount: 300 },
    ],
    [
      { category: 'Кафе', amount: 20000 },
      { category: 'Мелочь', amount: 10 },
    ],
  );

  // "Мелочь" grew 2900% but only by 290; "Кафе" grew 50% and by 10000.
  assert.equal(rise.category, 'Кафе');
  assert.equal(rise.absolute, 10000);
  assert.equal(rise.percent, 50);
});

addTest('biggest riser ignores categories that shrank or stayed flat', () => {
  const rise = getBiggestExpenseRise(
    [
      { category: 'Кафе', amount: 10000 },
      { category: 'Транспорт', amount: 5000 },
    ],
    [
      { category: 'Кафе', amount: 25000 },
      { category: 'Транспорт', amount: 5000 },
    ],
  );

  assert.equal(rise, null);
});

addTest('biggest riser flags a brand new category without a percentage', () => {
  const rise = getBiggestExpenseRise([{ category: 'Подписки', amount: 7000 }], []);

  assert.equal(rise.category, 'Подписки');
  assert.equal(rise.direction, 'new');
  assert.equal(rise.percent, null);
});

const MAY_2026 = new Date(2026, 4, 15).getTime();
const on = (year, month, day, amount) => ({ date: new Date(year, month, day).toISOString(), amount });

addTest('monthly series keeps empty months instead of skipping them', () => {
  const series = getMonthlySeries([on(2026, 4, 3, 50000)], [on(2026, 0, 9, 20000)], 6, MAY_2026);

  assert.equal(series.length, 6, 'six continuous months');
  assert.deepEqual(
    series.map((bucket) => bucket.key),
    ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
  );
  // February through April had nothing — they stay as zero columns.
  assert.equal(series[2].income + series[2].expenses, 0);
  assert.equal(series[1].expenses, 20000);
  assert.equal(series[5].income, 50000);
});

addTest('monthly series ignores entries outside the window', () => {
  const series = getMonthlySeries([on(2024, 1, 1, 99999)], [], 6, MAY_2026);

  assert.equal(
    series.reduce((sum, bucket) => sum + bucket.income, 0),
    0,
  );
});

addTest('monthly trend reports a rising spending run', () => {
  const series = [
    { key: 'a', year: 2026, month: 0, income: 10000, expenses: 1000 },
    { key: 'b', year: 2026, month: 1, income: 10000, expenses: 2000 },
    { key: 'c', year: 2026, month: 2, income: 10000, expenses: 3000 },
    { key: 'd', year: 2026, month: 3, income: 10000, expenses: 4000 },
  ];

  const trend = getMonthlyTrend(series);
  assert.equal(trend.kind, 'expenses-rising');
  assert.equal(trend.streak, 3, 'three month-over-month rises = a four month run');
});

addTest('monthly trend prefers the spending signal over the income one', () => {
  const series = [
    { key: 'a', year: 2026, month: 0, income: 1000, expenses: 1000 },
    { key: 'b', year: 2026, month: 1, income: 2000, expenses: 2000 },
    { key: 'c', year: 2026, month: 2, income: 3000, expenses: 3000 },
  ];

  assert.equal(getMonthlyTrend(series).kind, 'expenses-rising');
});

addTest('monthly trend stays quiet without enough data', () => {
  assert.equal(getMonthlyTrend([]).kind, 'insufficient');
  assert.equal(
    getMonthlyTrend([
      { key: 'a', year: 2026, month: 0, income: 0, expenses: 0 },
      { key: 'b', year: 2026, month: 1, income: 0, expenses: 0 },
      { key: 'c', year: 2026, month: 2, income: 5000, expenses: 0 },
    ]).kind,
    'insufficient',
    'a single active month is not a trend',
  );
});

addTest('monthly trend calls a flat series stable', () => {
  const series = [
    { key: 'a', year: 2026, month: 0, income: 5000, expenses: 3000 },
    { key: 'b', year: 2026, month: 1, income: 5000, expenses: 3000 },
    { key: 'c', year: 2026, month: 2, income: 5000, expenses: 3000 },
  ];

  assert.equal(getMonthlyTrend(series).kind, 'stable');
});

addTest('spending is grouped by the account it left', () => {
  const rows = aggregateExpensesByAccount(
    [
      { amount: 3000, meta: { accountName: 'Карта' } },
      { amount: 5000, meta: { accountName: 'Наличные' } },
      { amount: 4000, meta: { accountName: 'Карта' } },
    ],
    'Без счёта',
  );

  assert.deepEqual(rows, [
    { category: 'Карта', amount: 7000 },
    { category: 'Наличные', amount: 5000 },
  ]);
});

addTest('spending without an account falls back to a labelled bucket', () => {
  const rows = aggregateExpensesByAccount(
    [{ amount: 1000 }, { amount: 500, meta: null }, { amount: 250, meta: { accountName: '   ' } }],
    'Без счёта',
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, 'Без счёта');
  assert.equal(rows[0].amount, 1750);
});

addTest('report text lists every block that has rows', () => {
  const text = buildReportText('Отчёт', [
    {
      heading: 'Итог',
      rows: [
        { label: 'Доходы', value: '80 000' },
        { label: 'Сохранено', value: '47 000' },
      ],
    },
    { heading: 'По категориям', rows: [{ label: 'Кафе', value: '8 000' }] },
  ]);

  assert.equal(
    text,
    ['Отчёт', '', 'Итог', 'Доходы: 80 000', 'Сохранено: 47 000', '', 'По категориям', 'Кафе: 8 000'].join('\n'),
  );
});

addTest('report text drops empty blocks instead of printing bare headings', () => {
  const text = buildReportText('Отчёт', [
    { heading: 'Итог', rows: [{ label: 'Доходы', value: '0' }] },
    { heading: 'По счетам', rows: [] },
    { heading: 'По категориям', rows: undefined },
  ]);

  assert.equal(text.includes('По счетам'), false);
  assert.equal(text.includes('По категориям'), false);
  assert.equal(text, ['Отчёт', '', 'Итог', 'Доходы: 0'].join('\n'));
});
