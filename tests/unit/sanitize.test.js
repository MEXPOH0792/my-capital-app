import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { sanitizeImportedState } from '../harness/store.js';
import { DEFAULT_CURRENCY, MONEY_VERSION, toMinorUnits } from '../../src/utils/money.js';

addTest('legacy persisted state migrates to minor units', () => {
  const sanitized = sanitizeImportedState({
    language: 'ru',
    availableBalance: 50000,
    safetyFund: 15000,
    capital: 100000,
    totalSadakaPaid: 500,
    targetCapital: 1000000,
    targetSafety: 500000,
    requiredExpenses: [{ title: 'Rent', amount: 20000 }],
    debts: [{ title: 'Loan', amount: 300000, currentBalance: 250000, interestRate: 19 }],
  });

  assert.equal(sanitized.moneyVersion, MONEY_VERSION);
  assert.equal(sanitized.availableBalance, toMinorUnits(50000));
  assert.equal(sanitized.safetyFund, toMinorUnits(15000));
  assert.equal(sanitized.capital, toMinorUnits(100000));
  assert.equal(sanitized.totalSadakaPaid, toMinorUnits(500));
  assert.equal(sanitized.targetCapital, toMinorUnits(1000000));
  assert.equal(sanitized.targetSafety, toMinorUnits(500000));
  assert.equal(sanitized.requiredExpenses[0].amount, toMinorUnits(20000));
  assert.equal(sanitized.debts[0].currentBalance, toMinorUnits(250000));
  assert.equal(sanitized.debts[0].interestRate, 19);
});

addTest('already migrated state stays untouched', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    currency: 'USD',
    accounts: [
      { id: 'a', name: 'Card', balance: 700000, includeInSpendable: true, isSystem: true, systemKey: 'liquidPrimary' },
      { id: 'c', name: 'Safety', balance: 150000, includeInSpendable: false, isSystem: true, systemKey: 'safety' },
      { id: 'd', name: 'Capital', balance: 250000, includeInSpendable: false, isSystem: true, systemKey: 'capital' },
      { id: 'e', name: 'Sadaka', balance: 5000, includeInSpendable: false, isSystem: true, systemKey: 'sadaka' },
    ],
    totalSadakaPaid: 5000,
    targetCapital: 2234500,
    targetSafety: 1678900,
  });

  assert.equal(sanitized.availableBalance, 700000);
  assert.equal(sanitized.safetyFund, 150000);
  assert.equal(sanitized.capital, 250000);
  assert.equal(sanitized.currency, 'USD');
  assert.equal(sanitized.totalSadakaPaid, 5000);
  assert.equal(sanitized.targetCapital, 2234500);
  assert.equal(sanitized.targetSafety, 1678900);
  assert.equal(sanitized.accounts.find((item) => item.systemKey === 'sadaka')?.balance, 5000);
});

addTest('unsupported currency falls back to default currency', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    currency: 'BTC',
  });

  assert.equal(sanitized.currency, DEFAULT_CURRENCY);
});

addTest('legacy primary account name migrates from card to main account label', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    storageSetup: {
      liquidPrimaryName: 'Карта',
      liquidSecondaryName: 'Наличные',
      liquidPrimaryPercent: 70,
      liquidSecondaryPercent: 30,
    },
    accounts: [
      { id: 'a', name: 'Карта', balance: 700000, includeInSpendable: true, isSystem: true, systemKey: 'liquidPrimary' },
      {
        id: 'b',
        name: 'Наличные',
        balance: 300000,
        includeInSpendable: true,
        isSystem: true,
        systemKey: 'liquidSecondary',
      },
      {
        id: 'c',
        name: 'Копилка: подушка',
        balance: 150000,
        includeInSpendable: false,
        isSystem: true,
        systemKey: 'safety',
      },
      {
        id: 'd',
        name: 'Копилка: капитал',
        balance: 250000,
        includeInSpendable: false,
        isSystem: true,
        systemKey: 'capital',
      },
      {
        id: 'e',
        name: 'Копилка: садака',
        balance: 5000,
        includeInSpendable: false,
        isSystem: true,
        systemKey: 'sadaka',
      },
    ],
  });

  assert.equal(sanitized.storageSetup.liquidPrimaryName, 'Основной счёт');
  assert.equal(sanitized.accounts.find((item) => item.systemKey === 'liquidPrimary')?.name, 'Основной счёт');
  assert.equal(sanitized.availableBalance, 1000000);
  assert.equal(sanitized.totalSadakaPaid, 5000);
});

addTest('legacy card and cash accounts collapse into one main account', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    accounts: [
      { id: 'card', name: 'Карта', balance: 100, includeInSpendable: true, isPrimary: true, isSystem: true },
      { id: 'cash', name: 'Наличные', balance: 50, includeInSpendable: true, isSystem: true },
      {
        id: 'safety',
        name: 'Копилка: подушка',
        balance: 20,
        includeInSpendable: false,
        isSystem: true,
        systemKey: 'safety',
      },
      {
        id: 'capital',
        name: 'Копилка: капитал',
        balance: 30,
        includeInSpendable: false,
        isSystem: true,
        systemKey: 'capital',
      },
      {
        id: 'sadaka',
        name: 'Копилка: садака',
        balance: 10,
        includeInSpendable: false,
        isSystem: true,
        systemKey: 'sadaka',
      },
    ],
  });

  const spendableAccounts = sanitized.accounts.filter((item) => item.includeInSpendable);
  assert.equal(spendableAccounts.length, 1);
  assert.equal(spendableAccounts[0].name, 'Основной счёт');
  assert.equal(spendableAccounts[0].balance, 150);
  assert.equal(sanitized.totalSadakaPaid, 10);
});

addTest('import merges duplicate custom accounts with the same name', () => {
  const sanitized = sanitizeImportedState({
    moneyVersion: MONEY_VERSION,
    language: 'ru',
    accounts: [
      {
        id: 'main',
        name: 'Основной счёт',
        balance: 1000,
        includeInSpendable: true,
        isPrimary: true,
        isSystem: true,
        systemKey: 'liquidPrimary',
      },
      {
        id: 'trip-1',
        name: 'Отпуск',
        balance: 200,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: false,
        systemKey: null,
      },
      {
        id: 'trip-2',
        name: 'Отпуск',
        balance: 300,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: false,
        systemKey: null,
      },
      {
        id: 'safe',
        name: 'Копилка: подушка',
        balance: 50,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: true,
        systemKey: 'safety',
      },
      {
        id: 'capital',
        name: 'Копилка: капитал',
        balance: 80,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: true,
        systemKey: 'capital',
      },
      {
        id: 'sadaka',
        name: 'Садака',
        balance: 20,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: true,
        systemKey: 'sadaka',
      },
    ],
  });

  const vacationAccounts = sanitized.accounts.filter((item) => item.name === 'Отпуск');
  assert.equal(vacationAccounts.length, 1);
  assert.equal(vacationAccounts[0].balance, 500);
});
