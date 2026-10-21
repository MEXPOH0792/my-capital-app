import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  completeBaseOnboarding,
  getSystemAccount,
  resetStore,
  sanitizeImportedState,
  useStore,
} from '../harness/store.js';
import { isReportedExpense, isReportedIncome, isSadakaSetAside } from '../../src/domain/history.js';
import { getDebtDeleteBlock } from '../../src/domain/accounts.js';
import { getCopy } from '../../src/i18n.js';
import { MAX_AMOUNT_MINOR, isAmountTooLarge, parseMoneyInputToMinor, toMinorUnits } from '../../src/utils/money.js';

const state = () => useStore.getState();
const reload = () => useStore.setState(sanitizeImportedState(JSON.parse(JSON.stringify(state()))));
const primary = () => getSystemAccount('liquidPrimary').balance;
const start = (liquidPrimary = 10000) =>
  completeBaseOnboarding({ startingBalances: { liquidPrimary: toMinorUnits(liquidPrimary) } });

addTest('a loan added to the balance lands on the account and survives a reload', () => {
  resetStore();
  start();
  state().addDebt({ title: 'Кредит', amount: toMinorUnits(50000), type: 'LIABILITY', addToBalance: true });
  assert.equal(primary(), toMinorUnits(60000));
  state().addExpense(toMinorUnits(100), 'Кофе');
  reload();
  assert.equal(primary(), toMinorUnits(59900));
  assert.equal(state().availableBalance, toMinorUnits(59900));
  assert.equal(state().debts[0].addToBalance, true);
  assert.equal(state().debts[0].amount, undefined);
});

addTest('a loan not added to the balance moves no money', () => {
  resetStore();
  start();
  state().addDebt({ title: 'Ипотека', amount: toMinorUnits(50000), type: 'LIABILITY', addToBalance: false });
  assert.equal(primary(), toMinorUnits(10000));
  reload();
  assert.equal(state().transactions[0].meta.debtKind, 'created');
});

addTest('deleting the loan record rolls back the money and removes the debt', () => {
  resetStore();
  start();
  state().addDebt({ title: 'Кредит', amount: toMinorUnits(50000), type: 'LIABILITY', addToBalance: true });
  state().deleteTransaction(state().transactions[0].id);
  assert.equal(primary(), toMinorUnits(10000));
  assert.equal(state().debts.length, 0);
  assert.equal(state().transactions.length, 0);
});

addTest('the loan record cannot be deleted while payments against it exist', () => {
  resetStore();
  start();
  state().addDebt({ title: 'Кредит', amount: toMinorUnits(5000), type: 'LIABILITY', addToBalance: true });
  const created = state().transactions[0];
  state().payDebt(state().debts[0].id, toMinorUnits(1000));
  assert.equal(getDebtDeleteBlock(state().transactions, created), 'has_payments');
  state().deleteTransaction(created.id);
  assert.equal(state().debts.length, 1);
  assert.equal(primary(), toMinorUnits(14000));
});

addTest('lending takes money from the account and survives a reload', () => {
  resetStore();
  start();
  state().addDebt({ title: 'Другу', amount: toMinorUnits(3000), type: 'ASSET' });
  assert.equal(primary(), toMinorUnits(7000));
  reload();
  assert.equal(state().availableBalance, toMinorUnits(7000));
});

addTest('lending more than the account holds is rejected', () => {
  resetStore();
  start(1000);
  state().addDebt({ title: 'Другу', amount: toMinorUnits(3000), type: 'ASSET' });
  assert.equal(primary(), toMinorUnits(1000));
  assert.equal(state().debts.length, 0);
});

addTest('a returned loan lands on the account and deleting it restores the debt', () => {
  resetStore();
  start();
  state().addDebt({ title: 'Другу', amount: toMinorUnits(3000), type: 'ASSET' });
  const debtId = state().debts[0].id;
  state().payDebt(debtId, toMinorUnits(3000));
  assert.equal(primary(), toMinorUnits(10000));
  assert.equal(state().debts[0].status, 'CLOSED');

  reload();
  const repayment = state().transactions[0];
  assert.equal(repayment.meta.debtKind, 'repaid_to_me');
  state().deleteTransaction(repayment.id);
  assert.equal(primary(), toMinorUnits(7000));
  assert.equal(state().debts[0].currentBalance, toMinorUnits(3000));
  assert.equal(state().debts[0].status, 'ACTIVE');
});

addTest('debt money flows stay out of reports, loan payments stay in', () => {
  resetStore();
  start();
  state().addDebt({ title: 'Кредит', amount: toMinorUnits(500000), type: 'LIABILITY', addToBalance: true });
  state().addDebt({ title: 'Другу', amount: toMinorUnits(1000), type: 'ASSET' });
  state().payDebt(state().debts.find((item) => item.type === 'LIABILITY').id, toMinorUnits(2000));
  state().addIncome(toMinorUnits(100000), 'ЗП');

  const income = state()
    .transactions.filter(isReportedIncome)
    .reduce((sum, item) => sum + item.amount, 0);
  const spent = state()
    .transactions.filter((item) => isReportedExpense(item))
    .filter((item) => item.meta?.debtKind === 'payment')
    .reduce((sum, item) => sum + item.amount, 0);
  assert.equal(income, toMinorUnits(100000));
  assert.equal(spent, toMinorUnits(2000));
  assert.equal(
    state().transactions.some((item) => item.meta?.debtKind === 'lent' && isReportedExpense(item)),
    false,
  );
});

addTest('legacy debt records are tagged by category in either language and cannot be rolled back', () => {
  const ru = getCopy('ru');
  const en = getCopy('en');
  const legacy = sanitizeImportedState({
    moneyVersion: 2,
    language: 'en',
    transactions: [
      { id: 'c', type: 'income', amount: 100, category: `${ru.modal.debtCreated}: Bank`, date: '2026-01-01T00:00:00Z' },
      { id: 'l', type: 'expense', amount: 100, category: `${en.modal.debtCreated}: Pal`, date: '2026-01-01T00:00:00Z' },
      { id: 'r', type: 'income', amount: 100, category: `${ru.modal.debtPayment}: Pal`, date: '2026-01-01T00:00:00Z' },
    ],
  });
  const kinds = Object.fromEntries(legacy.transactions.map((item) => [item.id, item.meta?.debtKind]));
  assert.deepEqual(kinds, { c: 'created', l: 'lent', r: 'repaid_to_me' });
  legacy.transactions.forEach((item) => assert.equal(getDebtDeleteBlock(legacy.transactions, item), 'legacy'));
  assert.equal(legacy.transactions.filter(isReportedIncome).length, 0);
});

addTest('reserve and sadaka records keep their meaning after a language switch', () => {
  resetStore();
  completeBaseOnboarding({ requiredExpenses: [{ title: 'Аренда', amount: toMinorUnits(30000) }] });
  state().setIncomeDistributionBasis('free_after_required');
  state().addIncome(toMinorUnits(50000), 'ЗП');
  state().setLanguage('en');
  reload();
  const reserveRecord = state().transactions.find((item) => item.meta?.system === 'reserve');
  assert.ok(reserveRecord);
  assert.equal(isReportedExpense(reserveRecord), false);
});

addTest('legacy reserve records are recognised in either language', () => {
  const ru = getCopy('ru');
  const en = getCopy('en');
  const legacy = sanitizeImportedState({
    moneyVersion: 2,
    language: 'en',
    transactions: [
      { id: 'r1', type: 'expense', amount: 100, category: ru.common.reserveForRequired, date: '2020-01-01T00:00:00Z' },
      { id: 'r2', type: 'expense', amount: 100, category: en.common.reserveForRequired, date: '2021-01-01T00:00:00Z' },
      { id: 's1', type: 'expense', amount: 100, category: ru.common.sadakaAuto, date: '2022-01-01T00:00:00Z' },
    ],
  });
  const kinds = Object.fromEntries(legacy.transactions.map((item) => [item.id, item.meta?.system]));
  assert.deepEqual(kinds, { r1: 'reserve', r2: 'reserve', s1: 'sadaka' });
  const again = sanitizeImportedState({ ...legacy, moneyVersion: 2 });
  // Neither the reserve nor the sadaka share is spending.
  assert.equal(again.transactions.filter((item) => !isReportedExpense(item)).length, 3);
});

addTest('the sadaka share is set aside, not counted as spending', () => {
  resetStore();
  completeBaseOnboarding();
  state().addIncome(toMinorUnits(100000), 'ЗП');
  const sadaka = state().transactions.find((item) => item.meta?.system === 'sadaka');
  assert.ok(sadaka);
  assert.equal(isReportedExpense(sadaka), false);
  assert.equal(isSadakaSetAside(sadaka), true);
});

addTest('editing an income from a finished month leaves this month untouched', () => {
  resetStore();
  start(0);
  state().toggleIncomeDistribution();
  state().addIncome(toMinorUnits(1000), 'X');
  const income = state().transactions[0];
  useStore.setState({
    transactions: [
      {
        ...income,
        date: '2020-01-05T10:00:00.000Z',
        meta: { ...income.meta, coverage: { ...income.meta.coverage, monthKey: '2020-01' } },
      },
    ],
    monthlyCoverage: { ...state().monthlyCoverage, incomeTotal: 0 },
  });
  state().updateIncomeTransaction(income.id, toMinorUnits(2000), 'X');
  assert.equal(state().monthlyCoverage.incomeTotal, 0);
  assert.equal(state().transactions[0].meta.coverage.monthKey, '2020-01');
  assert.equal(primary(), toMinorUnits(2000));
});

addTest('amounts above the ceiling are refused', () => {
  resetStore();
  start(0);
  state().addIncome(MAX_AMOUNT_MINOR + 1, 'huge');
  assert.equal(state().transactions.length, 0);
  assert.equal(isAmountTooLarge(parseMoneyInputToMinor('99999999999999999')), true);
  assert.equal(isAmountTooLarge(MAX_AMOUNT_MINOR), false);
});
