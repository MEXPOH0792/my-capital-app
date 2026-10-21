import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  forecastLimit,
  getLimitProgress,
  getLimitStatus,
  getMonthlySpendByCategory,
} from '../../src/domain/finance.js';

const MAY_2026 = new Date(2026, 4, 15).getTime();
const spent = (year, month, day, category, amount) => ({
  date: new Date(year, month, day).toISOString(),
  category,
  amount,
});

addTest('monthly spend counts only the current calendar month', () => {
  const spend = getMonthlySpendByCategory(
    [
      spent(2026, 4, 2, 'Кафе', 3000),
      spent(2026, 4, 14, 'Кафе', 2000),
      spent(2026, 3, 28, 'Кафе', 9000), // last month, must not count
      spent(2026, 4, 5, 'Транспорт', 1500),
    ],
    MAY_2026,
  );

  assert.equal(spend['Кафе'], 5000);
  assert.equal(spend['Транспорт'], 1500);
});

addTest('limit status warns before the ceiling, not only after it', () => {
  assert.equal(getLimitStatus(0), 'ok');
  assert.equal(getLimitStatus(79), 'ok');
  assert.equal(getLimitStatus(80), 'warning');
  assert.equal(getLimitStatus(99), 'warning');
  assert.equal(getLimitStatus(100), 'exceeded');
  assert.equal(getLimitStatus(140), 'exceeded');
});

addTest('limit progress puts the categories in trouble first', () => {
  const progress = getLimitProgress(
    [
      { id: 'a', category: 'Кафе', amount: 10000 },
      { id: 'b', category: 'Транспорт', amount: 10000 },
      { id: 'c', category: 'Дом', amount: 10000 },
    ],
    { Кафе: 5000, Транспорт: 12000, Дом: 8500 },
  );

  assert.deepEqual(
    progress.map((item) => item.category),
    ['Транспорт', 'Дом', 'Кафе'],
  );
  assert.equal(progress[0].status, 'exceeded');
  assert.equal(progress[0].remaining, -2000, 'overspend is reported as negative');
  assert.equal(progress[1].status, 'warning');
  assert.equal(progress[2].status, 'ok');
});

addTest('limit progress ignores malformed entries', () => {
  const progress = getLimitProgress(
    [
      { id: 'a', category: 'Кафе', amount: 10000 },
      { id: 'b', category: '', amount: 5000 },
      { id: 'c', category: 'Дом', amount: 0 },
      null,
    ],
    {},
  );

  assert.equal(progress.length, 1);
  assert.equal(progress[0].category, 'Кафе');
});

addTest('forecast shows where the pending expense lands', () => {
  const limits = [{ id: 'a', category: 'Кафе', amount: 10000 }];

  const safe = forecastLimit(limits, { Кафе: 4000 }, 'Кафе', 1000);
  assert.equal(safe.projected, 5000);
  assert.equal(safe.remaining, 5000);
  assert.equal(safe.status, 'ok');

  const over = forecastLimit(limits, { Кафе: 9000 }, 'Кафе', 3000);
  assert.equal(over.projected, 12000);
  assert.equal(over.remaining, -2000);
  assert.equal(over.status, 'exceeded');
});

addTest('forecast stays silent for categories without a limit', () => {
  const limits = [{ id: 'a', category: 'Кафе', amount: 10000 }];

  assert.equal(forecastLimit(limits, {}, 'Транспорт', 5000), null);
  assert.equal(forecastLimit(limits, {}, '', 5000), null);
  assert.equal(forecastLimit([], {}, 'Кафе', 5000), null);
});
