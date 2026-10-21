import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  completeBaseOnboarding,
  getSystemAccount,
  resetStore,
  sanitizeImportedState,
  useStore,
} from '../harness/store.js';
import { getCopy } from '../../src/i18n.js';
import { parseBackupPayload } from '../../src/store/backupSchema.js';
import { toMinorUnits } from '../../src/utils/money.js';

addTest('core user flow survives onboarding income expense export and import', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: {
      liquidPrimary: toMinorUnits(10000),
      safety: toMinorUnits(1000),
      capital: toMinorUnits(2000),
      sadaka: 0,
    },
    requiredExpenses: [{ title: 'Rent', amount: toMinorUnits(3000) }],
    targetSafety: toMinorUnits(50000),
    targetCapital: toMinorUnits(100000),
    incomeDistributionMode: 'base',
  });

  const state = useStore.getState();
  state.addIncome(toMinorUnits(5000), 'Salary');
  const spendAccount = useStore.getState().accounts.find((item) => item.includeInSpendable);
  useStore.getState().addExpense(toMinorUnits(1200), 'Food', spendAccount.id);

  const beforeExport = useStore.getState();
  const backup = beforeExport.exportData();
  assert.doesNotThrow(() => parseBackupPayload(backup));
  assert.equal(beforeExport.transactions.length, 3);
  assert.ok(beforeExport.availableBalance > 0);

  resetStore();
  useStore.getState().importData(backup);
  const restored = useStore.getState();
  assert.equal(restored.transactions.length, 3);
  assert.equal(restored.availableBalance, beforeExport.availableBalance);
  assert.equal(restored.capital, beforeExport.capital);
});

addTest('completeOnboarding creates clean starting base without fake history', () => {
  resetStore();

  completeBaseOnboarding({
    startingBalances: {
      liquidPrimary: toMinorUnits(40000),
      liquidSecondary: toMinorUnits(10000),
      safety: toMinorUnits(15000),
      capital: toMinorUnits(25000),
      sadaka: toMinorUnits(1000),
    },
    debts: [{ title: 'Loan', amount: toMinorUnits(300000), bankName: 'Bank', interestRate: 18 }],
    requiredExpenses: [{ title: 'Rent', amount: toMinorUnits(20000) }],
  });

  const state = useStore.getState();
  assert.equal(state.isOnboardingCompleted, true);
  assert.equal(state.availableBalance, toMinorUnits(50000));
  assert.equal(state.safetyFund, toMinorUnits(15000));
  assert.equal(state.capital, toMinorUnits(25000));
  assert.equal(state.transactions.length, 0);
  assert.equal(state.debts.length, 1);
  assert.equal(state.requiredExpenses.length, 1);
});

addTest('addIncome distributes money across accounts and tracks sadaka', () => {
  resetStore();
  completeBaseOnboarding();

  useStore.getState().addIncome(toMinorUnits(100000), 'Salary');
  const state = useStore.getState();
  const primary = getSystemAccount('liquidPrimary');
  const safety = getSystemAccount('safety');
  const capital = getSystemAccount('capital');

  assert.equal(state.availableBalance, toMinorUnits(85000));
  assert.equal(state.safetyFund, toMinorUnits(8000));
  assert.equal(state.capital, toMinorUnits(6000));
  assert.equal(state.totalSadakaPaid, toMinorUnits(1000));
  assert.equal(primary.balance, toMinorUnits(85000));
  assert.equal(safety.balance, toMinorUnits(8000));
  assert.equal(capital.balance, toMinorUnits(6000));
  assert.equal(getSystemAccount('sadaka').balance, toMinorUnits(1000));
  assert.equal(state.transactions.length, 2);
});

addTest('updateIncomeTransaction reapplies a simple manual income safely', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(10000) },
  });

  useStore.getState().toggleIncomeDistribution();
  useStore.getState().addIncome(toMinorUnits(5000), 'Salary');
  const income = useStore.getState().transactions[0];

  useStore.getState().updateIncomeTransaction(income.id, toMinorUnits(8000), 'Bonus');
  const state = useStore.getState();

  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(18000));
  assert.equal(state.availableBalance, toMinorUnits(18000));
  assert.equal(state.transactions[0].category, 'Bonus');
  assert.equal(state.transactions[0].amount, toMinorUnits(8000));
  assert.equal(state.monthlyCoverage.incomeTotal, toMinorUnits(8000));
});

addTest('deleting the sadaka part deletes the whole distributed income', () => {
  resetStore();
  completeBaseOnboarding();

  useStore.getState().addIncome(toMinorUnits(100000), 'Salary');
  const sadakaTransaction = useStore
    .getState()
    .transactions.find((item) => item.category === getCopy('ru').common.sadakaAuto);
  assert.ok(sadakaTransaction);

  useStore.getState().deleteTransaction(sadakaTransaction.id);
  const state = useStore.getState();

  assert.equal(getSystemAccount('sadaka').balance, 0);
  assert.equal(getSystemAccount('safety').balance, 0);
  assert.equal(getSystemAccount('capital').balance, 0);
  assert.equal(state.availableBalance, 0);
  assert.equal(state.totalSadakaPaid, 0);
  assert.equal(state.transactions.length, 0);
});

addTest('deleting a distributed income rolls back its sadaka share too', () => {
  resetStore();
  completeBaseOnboarding();

  useStore.getState().addIncome(toMinorUnits(100000), 'Test');
  const income = useStore.getState().transactions.find((item) => item.type === 'income');
  useStore.getState().deleteTransaction(income.id);
  const state = useStore.getState();

  assert.equal(getSystemAccount('sadaka').balance, 0);
  assert.equal(getSystemAccount('safety').balance, 0);
  assert.equal(getSystemAccount('capital').balance, 0);
  assert.equal(state.availableBalance, 0);
  assert.equal(state.totalSadakaPaid, 0);
  assert.equal(state.transactions.length, 0);
});

addTest('editing a distributed income redistributes every share', () => {
  resetStore();
  completeBaseOnboarding();

  useStore.getState().addIncome(toMinorUnits(100000), 'Salary');
  const income = useStore.getState().transactions.find((item) => item.type === 'income');
  useStore.getState().updateIncomeTransaction(income.id, toMinorUnits(50000), 'Bonus');
  const state = useStore.getState();

  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(42500));
  assert.equal(getSystemAccount('safety').balance, toMinorUnits(4000));
  assert.equal(getSystemAccount('capital').balance, toMinorUnits(3000));
  assert.equal(getSystemAccount('sadaka').balance, toMinorUnits(500));
  assert.equal(state.totalSadakaPaid, toMinorUnits(500));
  assert.equal(state.transactions.length, 2);
  assert.equal(state.transactions[0].id, income.id);
  assert.equal(state.transactions[0].category, 'Bonus');
  assert.equal(state.transactions[1].meta.parentId, income.id);
});

addTest('legacy distributed income is linked to its sadaka record on load', () => {
  const date = '2026-09-01T10:00:00.000Z';
  const legacy = sanitizeImportedState({
    moneyVersion: 2,
    accounts: [
      {
        id: 'a1',
        name: 'Main',
        balance: 8500000,
        includeInSpendable: true,
        isPrimary: true,
        isSystem: true,
        systemKey: 'liquidPrimary',
      },
      {
        id: 'a2',
        name: 'Safety',
        balance: 800000,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: true,
        systemKey: 'safety',
      },
      {
        id: 'a3',
        name: 'Capital',
        balance: 600000,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: true,
        systemKey: 'capital',
      },
      {
        id: 'a4',
        name: 'Sadaka',
        balance: 100000,
        includeInSpendable: false,
        isPrimary: false,
        isSystem: true,
        systemKey: 'sadaka',
      },
    ],
    totalSadakaPaid: 100000,
    transactions: [
      {
        id: 'inc',
        type: 'income',
        amount: 10000000,
        category: 'Test',
        date,
        meta: {
          accountId: 'a1',
          effects: [
            { accountId: 'a1', delta: 8500000 },
            { accountId: 'a2', delta: 800000 },
            { accountId: 'a3', delta: 600000 },
          ],
        },
      },
      {
        id: 'sad',
        type: 'expense',
        amount: 100000,
        category: 'Sadaka',
        date,
        meta: { accountId: 'a4', effects: [{ accountId: 'a4', delta: 100000 }], sadakaPaidDelta: 100000 },
      },
    ],
  });

  const income = legacy.transactions.find((item) => item.id === 'inc');
  const sadaka = legacy.transactions.find((item) => item.id === 'sad');
  assert.equal(income.meta.distributed, true);
  assert.equal(income.meta.sadakaPaidDelta, 100000);
  assert.ok(income.meta.effects.some((item) => item.accountId === 'a4' && item.delta === 100000));
  assert.equal(sadaka.meta.parentId, 'inc');
  assert.equal(sadaka.meta.effects, undefined);
});

addTest('setAccountBalance corrects system accounts and accepts zero', () => {
  resetStore();
  completeBaseOnboarding();

  useStore.getState().addIncome(toMinorUnits(100000), 'Test');
  const sadaka = getSystemAccount('sadaka');
  const safety = getSystemAccount('safety');

  useStore.getState().setAccountBalance(sadaka.id, 0);
  useStore.getState().setAccountBalance(safety.id, toMinorUnits(1234));
  const state = useStore.getState();

  assert.equal(getSystemAccount('sadaka').balance, 0);
  assert.equal(getSystemAccount('safety').balance, toMinorUnits(1234));
  assert.equal(state.safetyFund, toMinorUnits(1234));
});

addTest('hideIncomePreset persists hidden income templates by language', () => {
  resetStore();
  useStore.getState().hideIncomePreset('ru', 'Зарплата');
  useStore.getState().hideIncomePreset('en', 'Salary');

  const state = useStore.getState();
  assert.deepEqual(state.hiddenIncomePresets.ru, ['Зарплата']);
  assert.deepEqual(state.hiddenIncomePresets.en, ['Salary']);
});

addTest('addExpense deducts from chosen spendable account', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: {
      liquidPrimary: toMinorUnits(70000),
      liquidSecondary: toMinorUnits(30000),
    },
  });

  const primary = getSystemAccount('liquidPrimary');
  useStore.getState().addExpense(toMinorUnits(10000), 'Groceries', primary.id);
  const state = useStore.getState();

  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(90000));
  assert.equal(state.availableBalance, toMinorUnits(90000));
  assert.equal(state.transactions[0].meta.accountId, primary.id);
});

addTest('updateExpenseTransaction reapplies a manual expense safely', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(50000) },
  });

  const primary = getSystemAccount('liquidPrimary');
  useStore.getState().addExpense(toMinorUnits(10000), 'Groceries', primary.id);
  const expense = useStore.getState().transactions[0];

  useStore.getState().updateExpenseTransaction(expense.id, toMinorUnits(15000), 'Fuel', primary.id);
  const state = useStore.getState();

  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(35000));
  assert.equal(state.availableBalance, toMinorUnits(35000));
  assert.equal(state.transactions[0].category, 'Fuel');
  assert.equal(state.transactions[0].amount, toMinorUnits(15000));
  assert.equal(state.transactions[0].meta.accountId, primary.id);
});

addTest('transferBetweenAccounts moves money and updates spendable balance when target is protected', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: {
      liquidPrimary: toMinorUnits(50000),
      safety: toMinorUnits(5000),
    },
  });

  const primary = getSystemAccount('liquidPrimary');
  const safety = getSystemAccount('safety');
  useStore.getState().transferBetweenAccounts(primary.id, safety.id, toMinorUnits(10000));
  const state = useStore.getState();

  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(40000));
  assert.equal(getSystemAccount('safety').balance, toMinorUnits(15000));
  assert.equal(state.availableBalance, toMinorUnits(40000));
  assert.equal(state.transactions[0].type, 'transfer');
});

addTest('payDebt deducts money and reduces liability balance', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(50000) },
    debts: [{ title: 'Loan', amount: toMinorUnits(30000), bankName: 'Bank', interestRate: 20 }],
  });

  const primary = getSystemAccount('liquidPrimary');
  const debt = useStore.getState().debts[0];
  useStore.getState().payDebt(debt.id, toMinorUnits(10000), primary.id);
  const state = useStore.getState();

  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(40000));
  assert.equal(state.availableBalance, toMinorUnits(40000));
  assert.equal(state.debts[0].currentBalance, toMinorUnits(20000));
  assert.equal(state.transactions[0].type, 'expense');
});

addTest('updateDebt changes debt fields and remaining balance', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(50000) },
    debts: [{ title: 'Loan', amount: toMinorUnits(30000), bankName: 'Bank', interestRate: 20 }],
  });

  const debt = useStore.getState().debts[0];
  useStore.getState().updateDebt(debt.id, {
    title: 'Renamed loan',
    amount: toMinorUnits(18000),
    bankName: 'Another Bank',
    interestRate: 12,
  });

  const updatedDebt = useStore.getState().debts[0];
  assert.equal(updatedDebt.title, 'Renamed loan');
  assert.equal(updatedDebt.bankName, 'Another Bank');
  assert.equal(updatedDebt.interestRate, 12);
  assert.equal(updatedDebt.currentBalance, toMinorUnits(18000));
  assert.equal(updatedDebt.initialBalance, toMinorUnits(30000));
  assert.equal(updatedDebt.status, 'ACTIVE');
});

addTest('deleteDebt removes the debt record without touching balances', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(50000) },
    debts: [{ title: 'Loan', amount: toMinorUnits(30000), bankName: 'Bank', interestRate: 20 }],
  });

  const balanceBefore = useStore.getState().availableBalance;
  const debt = useStore.getState().debts[0];
  useStore.getState().deleteDebt(debt.id);
  const state = useStore.getState();

  assert.equal(state.debts.length, 0);
  // Plain removal — balances are unaffected (past payments stay in history).
  assert.equal(state.availableBalance, balanceBefore);
});

addTest('deleteTransaction rolls back an expense safely', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(30000) },
  });

  const primary = getSystemAccount('liquidPrimary');
  useStore.getState().addExpense(toMinorUnits(5000), 'Coffee', primary.id);
  const createdTransactionId = useStore.getState().transactions[0].id;
  useStore.getState().deleteTransaction(createdTransactionId);
  const state = useStore.getState();

  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(30000));
  assert.equal(state.availableBalance, toMinorUnits(30000));
  assert.equal(state.transactions.length, 0);
});

addTest('renaming a custom account leaves past transactions readable', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(10000), safety: 0, capital: 0, sadaka: 0 },
  });

  useStore.getState().addAccount('Картв', toMinorUnits(5000), true);
  const account = useStore.getState().accounts.find((item) => item.name === 'Картв');
  useStore.getState().addExpense(toMinorUnits(1000), 'Кафе', account.id);

  useStore.getState().updateAccount(account.id, { name: 'Карта' });

  const state = useStore.getState();
  assert.equal(state.accounts.find((item) => item.id === account.id).name, 'Карта');
  // The old entry keeps the name it was made under, so history stays truthful.
  const entry = state.transactions.find((item) => item.meta?.accountId === account.id);
  assert.equal(entry.meta.accountName, 'Картв');
});

addTest('closing a custom account moves its money instead of losing it', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(10000), safety: 0, capital: 0, sadaka: 0 },
  });

  useStore.getState().addAccount('Копилка', toMinorUnits(3000), true);
  const account = useStore.getState().accounts.find((item) => item.name === 'Копилка');
  const totalBefore = useStore.getState().accounts.reduce((sum, item) => sum + item.balance, 0);

  useStore.getState().deleteAccount(account.id);

  const state = useStore.getState();
  assert.equal(
    state.accounts.some((item) => item.id === account.id),
    false,
    'account is gone',
  );
  assert.equal(
    state.accounts.reduce((sum, item) => sum + item.balance, 0),
    totalBefore,
    'not a kopeck lost',
  );
  const record = state.transactions[0];
  assert.equal(record.type, 'transfer');
  assert.equal(record.amount, toMinorUnits(3000));
  assert.match(record.category, /Счёт закрыт/);
});

addTest('system accounts cannot be renamed or deleted from the accounts screen', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(10000), safety: toMinorUnits(2000), capital: 0, sadaka: 0 },
  });

  const safety = getSystemAccount('safety');
  useStore.getState().updateAccount(safety.id, { name: 'Взломано' });
  useStore.getState().deleteAccount(safety.id);

  const state = useStore.getState();
  assert.equal(state.accounts.find((item) => item.id === safety.id).name, safety.name);
  assert.equal(state.safetyFund, toMinorUnits(2000));
});

addTest('closing an empty account needs no transfer record', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(10000), safety: 0, capital: 0, sadaka: 0 },
  });

  useStore.getState().addAccount('Пустой', 0, false);
  const account = useStore.getState().accounts.find((item) => item.name === 'Пустой');
  const entriesBefore = useStore.getState().transactions.length;

  useStore.getState().deleteAccount(account.id);

  assert.equal(useStore.getState().transactions.length, entriesBefore, 'no noise in history');
});

addTest('category limits survive export and import', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(10000), safety: 0, capital: 0, sadaka: 0 },
  });

  useStore.getState().setCategoryLimit('Кафе', toMinorUnits(5000));
  useStore.getState().setCategoryLimit('Транспорт', toMinorUnits(3000));
  // Setting the same category again replaces the ceiling instead of stacking.
  useStore.getState().setCategoryLimit('Кафе', toMinorUnits(7000));

  const backup = useStore.getState().exportData();
  resetStore();
  useStore.getState().importData(backup);

  const limits = useStore.getState().categoryLimits;
  assert.equal(limits.length, 2, 'no duplicate for the repeated category');
  assert.equal(limits.find((item) => item.category === 'Кафе').amount, toMinorUnits(7000));
  assert.equal(limits.find((item) => item.category === 'Транспорт').amount, toMinorUnits(3000));
});

addTest('a removed category limit stays removed', () => {
  resetStore();
  completeBaseOnboarding({
    startingBalances: { liquidPrimary: toMinorUnits(10000), safety: 0, capital: 0, sadaka: 0 },
  });

  useStore.getState().setCategoryLimit('Кафе', toMinorUnits(5000));
  const limit = useStore.getState().categoryLimits[0];
  useStore.getState().removeCategoryLimit(limit.id);

  assert.equal(useStore.getState().categoryLimits.length, 0);
});

addTest('the main account keeps its id across reloads so old operations stay editable', () => {
  resetStore();
  completeBaseOnboarding({ startingBalances: { liquidPrimary: toMinorUnits(10000) } });
  useStore.getState().addExpense(toMinorUnits(1000), 'Food');
  const before = useStore.getState();
  const primaryId = getSystemAccount('liquidPrimary').id;

  const reloaded = sanitizeImportedState(JSON.parse(JSON.stringify(before)));
  useStore.setState(reloaded);

  assert.equal(getSystemAccount('liquidPrimary').id, primaryId);
  const expense = useStore.getState().transactions.find((item) => item.category === 'Food');
  useStore.getState().updateExpenseTransaction(expense.id, toMinorUnits(2000), 'Food');
  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(8000));
});

addTest('history pointing at a lost main account id is relinked on load', () => {
  resetStore();
  completeBaseOnboarding({ startingBalances: { liquidPrimary: toMinorUnits(10000) } });
  useStore.getState().addExpense(toMinorUnits(1000), 'Food');
  const snapshot = JSON.parse(JSON.stringify(useStore.getState()));
  const oldId = snapshot.accounts.find((item) => item.systemKey === 'liquidPrimary').id;
  // Simulate the old bug: the main account came back with a different id.
  snapshot.accounts = snapshot.accounts.map((item) => (item.id === oldId ? { ...item, id: 'fresh-id' } : item));

  const reloaded = sanitizeImportedState(snapshot);
  const expense = reloaded.transactions.find((item) => item.category === 'Food');
  assert.equal(expense.meta.accountId, 'fresh-id');
  assert.equal(expense.meta.effects[0].accountId, 'fresh-id');

  useStore.setState(reloaded);
  useStore.getState().deleteTransaction(expense.id);
  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(10000));
});

addTest('setting "available now" keeps other cards and moves the difference to the main account', () => {
  resetStore();
  completeBaseOnboarding({ startingBalances: { liquidPrimary: toMinorUnits(1000) } });
  useStore.getState().addAccount('Карта', toMinorUnits(500), true);

  useStore.getState().setAvailableBalance(toMinorUnits(2000));
  assert.equal(useStore.getState().availableBalance, toMinorUnits(2000));
  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(1500));

  useStore.getState().setAvailableBalance(toMinorUnits(300));
  assert.equal(useStore.getState().availableBalance, toMinorUnits(2000));

  useStore.getState().setAvailableBalance(toMinorUnits(500));
  assert.equal(getSystemAccount('liquidPrimary').balance, 0);
});

addTest('a user account named like a legacy one ("Карта") survives reloads', () => {
  resetStore();
  completeBaseOnboarding({ startingBalances: { liquidPrimary: toMinorUnits(1000) } });
  useStore.getState().addAccount('Карта', toMinorUnits(500), true);
  useStore.getState().addAccount('Наличные', toMinorUnits(200), true);

  const reloaded = sanitizeImportedState(JSON.parse(JSON.stringify(useStore.getState())));
  const names = reloaded.accounts.map((item) => item.name);
  assert.ok(names.includes('Карта'));
  assert.ok(names.includes('Наличные'));
  assert.equal(reloaded.accounts.find((item) => item.systemKey === 'liquidPrimary').balance, toMinorUnits(1000));
});

addTest('old-format "Карта" / "Наличные" accounts still fold into the main account', () => {
  const legacy = sanitizeImportedState({
    moneyVersion: 2,
    language: 'ru',
    accounts: [
      { id: 'k', name: 'Карта', balance: 100000, includeInSpendable: true, isPrimary: true },
      { id: 'n', name: 'Наличные', balance: 50000, includeInSpendable: true },
    ],
  });
  const spendable = legacy.accounts.filter((item) => item.includeInSpendable);
  assert.equal(spendable.length, 1);
  assert.equal(spendable[0].systemKey, 'liquidPrimary');
  assert.equal(spendable[0].balance, 150000);
});
