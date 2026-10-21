import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  FAMILY_REPORT_KIND,
  buildFamilyReportFile,
  getFamilyMonthView,
  getMonthlyExpenseSummary,
  getPreviousMonthKey,
  parseFamilyReportFile,
  upsertFamilyReport,
} from '../../src/domain/family.js';
import { toMinorUnits } from '../../src/utils/money.js';

const expense = (
  amount,
  category,
  date,
  meta = { accountId: 'a1', effects: [{ accountId: 'a1', delta: -amount }] },
) => ({
  id: `${category}-${date}`,
  type: 'expense',
  amount,
  category,
  date,
  meta,
});

addTest('the monthly summary counts only real spending of that month', () => {
  const summary = getMonthlyExpenseSummary(
    [
      expense(toMinorUnits(1000), 'Еда', '2026-09-03T10:00:00Z'),
      expense(toMinorUnits(500), 'Еда', '2026-09-20T10:00:00Z'),
      expense(toMinorUnits(700), 'Транспорт', '2026-09-11T10:00:00Z'),
      expense(toMinorUnits(999), 'Еда', '2026-08-31T10:00:00Z'),
      expense(toMinorUnits(3000), 'Резерв', '2026-09-05T10:00:00Z', { parentId: 'i1', system: 'reserve' }),
      expense(toMinorUnits(100), 'Садака', '2026-09-05T10:00:00Z', { parentId: 'i1', system: 'sadaka' }),
      expense(toMinorUnits(2000), 'Долг другу', '2026-09-06T10:00:00Z', { debtId: 'd1', debtKind: 'lent' }),
      { id: 'inc', type: 'income', amount: toMinorUnits(9000), category: 'ЗП', date: '2026-09-01T10:00:00Z' },
    ],
    '2026-09',
  );

  assert.equal(summary.expensesTotal, toMinorUnits(2200));
  assert.deepEqual(summary.categories, [
    { category: 'Еда', amount: toMinorUnits(1500) },
    { category: 'Транспорт', amount: toMinorUnits(700) },
  ]);
});

addTest('the shared file carries only month, currency, total and categories', () => {
  const file = buildFamilyReportFile({
    senderId: 'abc123',
    senderName: 'Аиша',
    currency: 'RUB',
    summary: {
      monthKey: '2026-09',
      expensesTotal: toMinorUnits(4500),
      categories: [{ category: 'Еда', amount: toMinorUnits(4500) }],
    },
    exportedAt: '2026-09-30T18:00:00.000Z',
  });

  assert.deepEqual(Object.keys(file).sort(), [
    'categories',
    'currency',
    'expensesTotal',
    'exportedAt',
    'kind',
    'monthKey',
    'sender',
    'v',
  ]);
  assert.equal(file.kind, FAMILY_REPORT_KIND);
  assert.equal(JSON.stringify(file).includes('accountId'), false);
});

addTest('a report in another currency is refused, a foreign file is parsed', () => {
  const file = buildFamilyReportFile({
    senderId: 'abc',
    senderName: 'Аиша',
    currency: 'USD',
    summary: { monthKey: '2026-09', expensesTotal: 100, categories: [] },
  });
  assert.throws(() => parseFamilyReportFile(file, 'RUB'), { code: 'currency_mismatch' });
  assert.equal(parseFamilyReportFile(file, 'USD').monthKey, '2026-09');
  assert.throws(() => parseFamilyReportFile({ hello: 'world' }, 'RUB'), { code: 'not_a_report' });
  assert.throws(() => parseFamilyReportFile({ ...file, v: 99 }, 'USD'), { code: 'newer_version' });
  assert.throws(() => parseFamilyReportFile({ ...file, monthKey: '2026-13' }, 'USD'), { code: 'not_a_report' });
});

addTest('re-importing a month replaces it instead of doubling the total', () => {
  const first = {
    monthKey: '2026-09',
    expensesTotal: 100,
    categories: [],
    currency: 'RUB',
    exportedAt: '',
    importedAt: '',
  };
  const second = { ...first, expensesTotal: 300 };
  const older = { ...first, monthKey: '2026-08' };

  const reports = upsertFamilyReport(upsertFamilyReport([older], first), second);
  assert.equal(reports.length, 2);
  assert.deepEqual(
    reports.map((item) => [item.monthKey, item.expensesTotal]),
    [
      ['2026-09', 300],
      ['2026-08', 100],
    ],
  );
});

addTest('the family view sums both sides and merges shared categories', () => {
  const mine = {
    monthKey: '2026-09',
    expensesTotal: toMinorUnits(30000),
    categories: [
      { category: 'Еда', amount: toMinorUnits(20000) },
      { category: 'Авто', amount: toMinorUnits(10000) },
    ],
  };
  const partner = {
    monthKey: '2026-09',
    currency: 'RUB',
    expensesTotal: toMinorUnits(10000),
    categories: [
      { category: 'Еда', amount: toMinorUnits(6000) },
      { category: 'Дети', amount: toMinorUnits(4000) },
    ],
    exportedAt: '',
    importedAt: '',
  };

  const view = getFamilyMonthView(mine, partner);
  assert.equal(view.total, toMinorUnits(40000));
  assert.equal(view.mineTotal, toMinorUnits(30000));
  assert.equal(view.partnerTotal, toMinorUnits(10000));
  assert.equal(view.minePercent, 75);
  assert.equal(view.partnerMissing, false);
  assert.deepEqual(view.categories[0], {
    category: 'Еда',
    mine: toMinorUnits(20000),
    partner: toMinorUnits(6000),
    total: toMinorUnits(26000),
  });

  const alone = getFamilyMonthView(mine, null);
  assert.equal(alone.partnerMissing, true);
  assert.equal(alone.total, toMinorUnits(30000));
});

addTest('month keys step back across a year boundary', () => {
  assert.equal(getPreviousMonthKey('2026-01'), '2025-12');
  assert.equal(getPreviousMonthKey('2026-10'), '2026-09');
});
