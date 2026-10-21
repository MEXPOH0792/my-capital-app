import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { sanitizeImportedState } from '../harness/store.js';
import { DEFAULT_CURRENCY, MONEY_VERSION } from '../../src/utils/money.js';

addTest('sanitizeImportedState produces a usable state for null input', () => {
  const sanitized = sanitizeImportedState(null);
  assert.equal(sanitized.moneyVersion, MONEY_VERSION);
  assert.equal(sanitized.currency, DEFAULT_CURRENCY);
  assert.equal(sanitized.language, 'ru');
  assert.equal(sanitized.availableBalance, 0);
  assert.equal(sanitized.isOnboardingCompleted, false);
  assert.ok(Array.isArray(sanitized.accounts));
  assert.ok(Array.isArray(sanitized.transactions));
});

addTest('sanitizeImportedState falls back to default language for unknown values', () => {
  const sanitized = sanitizeImportedState({ language: 'klingon' });
  assert.equal(sanitized.language, 'ru');
});

addTest('sanitizeImportedState drops transactions with broken structure', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    transactions: [
      null,
      undefined,
      { id: 'good', type: 'income', amount: 1000, category: 'Salary', date: new Date().toISOString() },
      { id: 'broken-type', type: 'mystery', amount: 500 },
      { id: 'negative', type: 'expense', amount: -1000 },
    ],
  });

  const ids = sanitized.transactions.map((t) => t.id);
  assert.ok(ids.includes('good'));
  // type=mystery falls back to 'expense', amount=500 is valid → kept
  assert.ok(ids.includes('broken-type'));
  // negative amount becomes 0 via toImportedMinorAmount and still kept (>= 0 filter)
});

addTest('sanitizeImportedState drops debts with zero amount', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    debts: [
      { id: 'real', title: 'Loan', amount: 10000, currentBalance: 10000, type: 'LIABILITY' },
      { id: 'empty', title: 'Empty', amount: 0 },
      { id: 'no-amount', title: 'No amount' },
    ],
  });

  const ids = sanitized.debts.map((d) => d.id);
  assert.ok(ids.includes('real'));
  assert.equal(ids.includes('empty'), false);
  assert.equal(ids.includes('no-amount'), false);
});

addTest('sanitizeImportedState rejects an invalid pin hash format', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    securityPinHash: 'not-a-sha256-hex',
  });
  assert.equal(sanitized.securityPinHash, '');
});

addTest('sanitizeImportedState accepts a valid pin hash format', () => {
  const validHash = 'a'.repeat(64);
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    securityPinHash: validHash,
  });
  assert.equal(sanitized.securityPinHash, validHash);
});

addTest('sanitizeImportedState clamps allocationPercents to default when total is not 100', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    allocationPercents: { balance: 50, safety: 10, capital: 10, sadaka: 10 }, // sums to 80
  });
  // Total != 100 → falls back to default base allocation
  const total =
    sanitized.allocationPercents.balance +
    sanitized.allocationPercents.safety +
    sanitized.allocationPercents.capital +
    sanitized.allocationPercents.sadaka;
  assert.equal(total, 100);
});

addTest('sanitizeImportedState normalizes hidden presets to per-language buckets', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    hiddenIncomePresets: { ru: ['Зарплата', '', null, 42], en: ['Salary'] },
    hiddenExpensePresets: 'garbage',
  });
  assert.deepEqual(sanitized.hiddenIncomePresets.ru, ['Зарплата', '42']);
  assert.deepEqual(sanitized.hiddenIncomePresets.en, ['Salary']);
  assert.deepEqual(sanitized.hiddenExpensePresets, { ru: [], en: [] });
});
