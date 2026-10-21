import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  ERROR_BUFFER_STORAGE_KEY,
  buildDiagnosticsSnapshot,
  clearDiagnosticErrors,
  recordDiagnosticError,
  serializeDiagnosticsSnapshot,
} from '../../src/utils/diagnostics.js';

// Sensitive markers — each must NEVER appear in the serialized snapshot.
const SECRETS = {
  pinHashEnvelope: JSON.stringify({
    v: 2,
    algo: 'pbkdf2-sha256',
    iter: 200000,
    salt: 'a'.repeat(64),
    hash: 'b'.repeat(64),
  }),
  accountName: 'My-Secret-Account-Name',
  debtTitle: 'Confidential Mortgage 42',
  debtBank: 'Top-Secret-Bank',
  categoryUser: 'Underwear shopping spree',
  amount: 1_234_567,
  targetCapital: 9_876_543,
};

// All user-controlled strings use a `Z9X-` prefix so they cannot accidentally
// be substrings of structural snapshot keys (e.g. "hasSadakaName" — the word
// "Sadaka" is a system label that legitimately appears in our key names but
// MUST NOT appear as a user-data value in the output).
const USER = {
  accountPrimary: 'Z9X-MyAccount-A',
  accountCustom: 'Z9X-VacationStash-B',
  storageSafety: 'Z9X-CustomSafety-C',
  storageCapital: 'Z9X-CustomCapital-D',
  storageSadaka: 'Z9X-CustomSadaka-E',
  debtTitle: 'Z9X-PrivateMortgage-F',
  debtBank: 'Z9X-PrivateBank-G',
  category: 'Z9X-PrivateCategory-H',
  requiredTitle: 'Z9X-PrivateBill-I',
  hiddenIncome: 'Z9X-HiddenSalary-J',
  hiddenExpense: 'Z9X-HiddenFun-K',
};

const buildSensitiveState = () => ({
  language: 'ru',
  currency: 'USD',
  isDarkMode: true,
  isOnboardingCompleted: true,
  moneyVersion: 2,
  incomeDistributionEnabled: true,
  incomeDistributionMode: 'base',
  incomeDistributionBasis: 'total_income',
  securityPinHash: SECRETS.pinHashEnvelope,
  storageSetup: {
    liquidPrimaryName: USER.accountPrimary,
    safetyName: USER.storageSafety,
    capitalName: USER.storageCapital,
    sadakaName: USER.storageSadaka,
    liquidPrimaryPercent: 100,
    liquidSecondaryPercent: 0,
  },
  accounts: [
    {
      id: 'a1',
      name: USER.accountPrimary,
      balance: SECRETS.amount,
      includeInSpendable: true,
      isSystem: true,
      systemKey: 'liquidPrimary',
    },
    {
      id: 'a2',
      name: USER.accountCustom,
      balance: 500,
      includeInSpendable: false,
      isSystem: false,
      systemKey: null,
    },
  ],
  transactions: [
    {
      id: 't1',
      type: 'income',
      amount: SECRETS.amount,
      category: USER.category,
      date: '2026-04-12T10:00:00.000Z',
      meta: { accountId: 'a1', accountName: USER.accountPrimary },
    },
    {
      id: 't2',
      type: 'expense',
      amount: 5000,
      category: USER.category,
      date: '2026-04-13T10:00:00.000Z',
    },
    {
      id: 't3',
      type: 'transfer',
      amount: 300,
      category: USER.category,
      date: '2026-04-14T10:00:00.000Z',
    },
  ],
  debts: [
    {
      id: 'd1',
      title: USER.debtTitle,
      bankName: USER.debtBank,
      amount: SECRETS.amount,
      currentBalance: SECRETS.amount,
      initialBalance: SECRETS.amount,
      type: 'LIABILITY',
      status: 'ACTIVE',
      interestRate: 22,
    },
  ],
  requiredExpenses: [{ id: 'r1', title: USER.requiredTitle, amount: 9999 }],
  monthlyCoverage: { monthKey: '2026-04', incomeTotal: SECRETS.amount, requiredCovered: 1000 },
  hiddenIncomePresets: { ru: [USER.hiddenIncome], en: [] },
  hiddenExpensePresets: { ru: [], en: [USER.hiddenExpense] },
  targetCapital: SECRETS.targetCapital,
  targetSafety: 50000,
  availableBalance: SECRETS.amount,
  safetyFund: SECRETS.amount,
  capital: SECRETS.amount,
  totalSadakaPaid: 1000,
});

addTest('diagnostics snapshot contains no monetary amounts, names or categories', () => {
  clearDiagnosticErrors();
  const snapshot = buildDiagnosticsSnapshot(buildSensitiveState());
  const text = serializeDiagnosticsSnapshot(snapshot);

  const forbidden = [
    ...Object.values(USER),
    String(SECRETS.amount),
    String(SECRETS.targetCapital),
    SECRETS.pinHashEnvelope,
    'a'.repeat(64),
    'b'.repeat(64),
  ];

  for (const needle of forbidden) {
    if (text.includes(needle)) {
      assert.fail(`Diagnostics output leaked sensitive value: ${needle}`);
    }
  }
});

addTest('diagnostics snapshot reports the right structural counts', () => {
  clearDiagnosticErrors();
  const snapshot = buildDiagnosticsSnapshot(buildSensitiveState());
  assert.equal(snapshot.accounts.total, 2);
  assert.equal(snapshot.accounts.system, 1);
  assert.equal(snapshot.accounts.custom, 1);
  assert.equal(snapshot.accounts.includedInSpendable, 1);
  assert.equal(snapshot.accounts.withBalance, 2);
  assert.equal(snapshot.transactions.total, 3);
  assert.equal(snapshot.transactions.income, 1);
  assert.equal(snapshot.transactions.expense, 1);
  assert.equal(snapshot.transactions.transfer, 1);
  assert.equal(snapshot.debts.total, 1);
  assert.equal(snapshot.debts.active, 1);
  assert.equal(snapshot.debts.liabilities, 1);
  assert.equal(snapshot.debts.withInterestRate, 1);
  assert.equal(snapshot.requiredExpenses.total, 1);
  assert.equal(snapshot.hiddenPresets.income.ru, 1);
  assert.equal(snapshot.hiddenPresets.expense.en, 1);
  assert.equal(snapshot.security.pinEnabled, true);
  assert.equal(snapshot.security.pinFormat, 'pbkdf2-v2');
});

addTest('diagnostics snapshot detects legacy SHA-256 PIN format', () => {
  clearDiagnosticErrors();
  const legacyHash = 'c'.repeat(64);
  const snapshot = buildDiagnosticsSnapshot({ ...buildSensitiveState(), securityPinHash: legacyHash });
  assert.equal(snapshot.security.pinFormat, 'sha256-legacy');
  // The raw hash must still not appear in the output.
  const text = serializeDiagnosticsSnapshot(snapshot);
  assert.equal(text.includes(legacyHash), false);
});

addTest('recordDiagnosticError appends to the FIFO buffer up to 10 entries', () => {
  clearDiagnosticErrors();
  for (let i = 0; i < 12; i += 1) {
    recordDiagnosticError(Object.assign(new Error(`boom ${i}`), { stack: `stack ${i}` }));
  }
  const snapshot = buildDiagnosticsSnapshot(buildSensitiveState());
  assert.equal(snapshot.recentErrors.length, 10);
  // FIFO trim keeps the most recent entries.
  assert.equal(snapshot.recentErrors[snapshot.recentErrors.length - 1].message, 'boom 11');
  assert.equal(snapshot.recentErrors[0].message, 'boom 2');
});

addTest('recordDiagnosticError truncates very long stacks to keep the buffer small', () => {
  clearDiagnosticErrors();
  const huge = 'x'.repeat(20_000);
  recordDiagnosticError(Object.assign(new Error('big'), { stack: huge }));
  const snapshot = buildDiagnosticsSnapshot(buildSensitiveState());
  const entry = snapshot.recentErrors[snapshot.recentErrors.length - 1];
  assert.ok(entry.stack.length <= 4096);
});

addTest('clearDiagnosticErrors empties the buffer', () => {
  recordDiagnosticError(new Error('present'));
  clearDiagnosticErrors();
  const snapshot = buildDiagnosticsSnapshot(buildSensitiveState());
  assert.equal(snapshot.recentErrors.length, 0);
  assert.equal(typeof localStorage.getItem(ERROR_BUFFER_STORAGE_KEY), 'object'); // null
});
