import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { getActiveCategoryPresets } from '../../src/domain/finance.js';
import { getCopy } from '../../src/i18n.js';

addTest('active category presets include frequently used categories from history', () => {
  const copy = getCopy('en');
  const presets = getActiveCategoryPresets({
    language: 'en',
    type: 'expense',
    copy,
    hiddenPresets: [],
    transactions: [
      { type: 'expense', category: 'Taxi' },
      { type: 'expense', category: 'Coffee' },
      { type: 'expense', category: 'Taxi' },
      { type: 'expense', category: 'Reserved for essential bills' },
      { type: 'expense', category: 'Debt payment: Credit card' },
      { type: 'income', category: 'Salary' },
    ],
  });

  assert.equal(presets[0], 'Taxi');
  assert.ok(presets.includes('Coffee'));
  assert.ok(presets.includes('Groceries'));
  assert.equal(presets.includes('Reserved for essential bills'), false);
  assert.equal(presets.includes('Debt payment: Credit card'), false);
});

addTest('recent habits outrank categories that were used more but long ago', () => {
  const copy = getCopy('en');
  // Transactions are newest-first: three fresh "Cafe" entries at the top and a
  // long-abandoned "Taxi" streak far down the history.
  // Transfers are ignored by the ranking, so they only push "Taxi" further back
  // in history without competing for a slot themselves.
  const transactions = [
    { type: 'expense', category: 'Cafe' },
    { type: 'expense', category: 'Cafe' },
    { type: 'expense', category: 'Cafe' },
    ...Array.from({ length: 80 }, () => ({ type: 'transfer', category: 'Move' })),
    ...Array.from({ length: 6 }, () => ({ type: 'expense', category: 'Taxi' })),
  ];

  const presets = getActiveCategoryPresets({ language: 'en', type: 'expense', copy, hiddenPresets: [], transactions });

  assert.equal(presets[0], 'Cafe');
  assert.ok(presets.indexOf('Cafe') < presets.indexOf('Taxi'));
});

addTest('hidden presets stay out of the list', () => {
  const copy = getCopy('en');
  const presets = getActiveCategoryPresets({
    language: 'en',
    type: 'expense',
    copy,
    hiddenPresets: ['Groceries', 'Taxi'],
    transactions: [{ type: 'expense', category: 'Taxi' }],
  });

  assert.equal(presets.includes('Groceries'), false);
  assert.equal(presets.includes('Taxi'), false);
  assert.ok(presets.includes('Cafe'));
});
