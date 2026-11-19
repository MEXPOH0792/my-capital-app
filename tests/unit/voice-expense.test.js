import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addTest } from '../harness/runner.js';
import { parseVoiceCommand, parseVoiceExpense } from '../../src/utils/voiceExpenseParser.js';

const golden = JSON.parse(readFileSync(new URL('../fixtures/voice-command-golden.json', import.meta.url), 'utf-8'));

const accounts = [
  { id: 'main', name: 'Основная карта' },
  { id: 'cash', name: 'Наличные' },
];

addTest('voice expense matches an existing category, amount and account', () => {
  assert.deepEqual(
    parseVoiceExpense('Продукты 1 240 рублей с основной карты', {
      categories: ['Продукты', 'Такси'],
      accounts,
    }),
    {
      transcript: 'Продукты 1 240 рублей с основной карты',
      amountMinor: 124000,
      categoryPreset: 'Продукты',
      customCategory: '',
      accountId: 'main',
    },
  );
});

addTest('voice expense understands Russian number words', () => {
  const result = parseVoiceExpense('Кофе триста пятьдесят рублей', { categories: [], accounts });
  assert.equal(result.amountMinor, 35000);
  assert.equal(result.customCategory, 'Кофе');
});

addTest('voice expense understands thousands and a named cash account', () => {
  const result = parseVoiceExpense('Такси две тысячи сто рублей наличные', {
    categories: ['Такси'],
    accounts,
  });
  assert.equal(result.amountMinor, 210000);
  assert.equal(result.categoryPreset, 'Такси');
  assert.equal(result.accountId, 'cash');
});

addTest('voice expense preserves decimal minor units', () => {
  const result = parseVoiceExpense('Аптека 349,90', { categories: ['Аптека'], accounts });
  assert.equal(result.amountMinor, 34990);
});

addTest('voice expense understands inflected thousand words returned by Android', () => {
  assert.equal(parseVoiceExpense('Кофе тысячу двести рублей', { accounts }).amountMinor, 120000);
  assert.equal(parseVoiceExpense('Продукты полторы тысячи', { accounts }).amountMinor, 150000);
});

addTest('voice expense accepts compact Honor number formatting', () => {
  assert.equal(parseVoiceExpense('Кофе 1200руб', { accounts }).amountMinor, 120000);
  assert.equal(parseVoiceExpense('Такси 1.200 рублей', { accounts }).amountMinor, 120000);
});

addTest('web voice parser matches the shared Web/Android golden fixtures', () => {
  for (const fixture of golden.cases) {
    assert.deepEqual(
      parseVoiceCommand(fixture.transcript, {
        accounts: golden.accounts,
        categories: golden.categories,
      }),
      fixture.expected,
      fixture.id,
    );
  }
});
