import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  getTransactionRelatedAccountIds,
  rollbackTransactionState,
  syncMonthlyCoverage,
} from '../../src/store/stateHelpers.js';
import { getTodayReportedExpense } from '../../src/domain/history.js';

addTest('rollbackTransactionState reverts account, debt and coverage effects', () => {
  const monthKey = syncMonthlyCoverage().monthKey;
  const state = {
    accounts: [{ id: 'card', balance: 500000 }],
    debts: [{ id: 'loan', initialBalance: 300000, currentBalance: 200000, status: 'ACTIVE' }],
    monthlyCoverage: { monthKey, incomeTotal: 5000000, requiredCovered: 1500000 },
  };
  const transaction = {
    meta: {
      effects: [{ accountId: 'card', delta: -100000 }],
      debtEffects: [{ debtId: 'loan', currentBalanceDelta: -100000 }],
      coverage: { monthKey, incomeTotalDelta: 500000, requiredCoveredDelta: 200000 },
    },
  };

  const rolledBack = rollbackTransactionState(state, transaction);

  assert.ok(rolledBack);
  assert.equal(rolledBack.accounts[0].balance, 600000);
  assert.equal(rolledBack.debts[0].currentBalance, 300000);
  assert.equal(rolledBack.monthlyCoverage.incomeTotal, 4500000);
  assert.equal(rolledBack.monthlyCoverage.requiredCovered, 1300000);
});

addTest('rollbackTransactionState blocks invalid debt rollback', () => {
  const state = {
    accounts: [{ id: 'card', balance: 500000 }],
    debts: [{ id: 'loan', initialBalance: 300000, currentBalance: 290000, status: 'ACTIVE' }],
    monthlyCoverage: syncMonthlyCoverage(),
  };
  const transaction = {
    meta: {
      debtEffects: [{ debtId: 'loan', currentBalanceDelta: -20000 }],
    },
  };

  assert.equal(rollbackTransactionState(state, transaction), null);
});

addTest('transaction account relations use meta only and do not guess by category', () => {
  const transfer = {
    type: 'transfer',
    category: 'Transfer: Card -> Cash',
    meta: {
      fromAccountId: 'card',
      toAccountId: 'cash',
      effects: [
        { accountId: 'card', delta: -1000 },
        { accountId: 'cash', delta: 1000 },
      ],
    },
  };
  const legacyLookingTransaction = {
    type: 'transfer',
    category: 'Transfer: Card -> Cash',
    meta: null,
  };

  assert.deepEqual(getTransactionRelatedAccountIds(transfer), ['card', 'cash']);
  assert.deepEqual(getTransactionRelatedAccountIds(legacyLookingTransaction), []);
});

addTest('today widget expense counts only real expenses from the local day', () => {
  const now = new Date(2026, 10, 5, 12, 0, 0).getTime();
  const transactions = [
    { type: 'expense', amount: 45000, date: new Date(2026, 10, 5, 9, 0, 0).toISOString(), meta: {} },
    {
      type: 'expense',
      amount: 5000,
      date: new Date(2026, 10, 5, 10, 0, 0).toISOString(),
      meta: { debtKind: 'payment' },
    },
    {
      type: 'expense',
      amount: 9000,
      date: new Date(2026, 10, 5, 10, 30, 0).toISOString(),
      meta: { system: 'reserve' },
    },
    { type: 'expense', amount: 7000, date: new Date(2026, 10, 5, 11, 0, 0).toISOString(), meta: { debtKind: 'lent' } },
    { type: 'expense', amount: 12000, date: new Date(2026, 10, 4, 23, 0, 0).toISOString(), meta: {} },
    { type: 'income', amount: 100000, date: new Date(2026, 10, 5, 8, 0, 0).toISOString(), meta: {} },
  ];

  assert.equal(getTodayReportedExpense(transactions, now), 50000);
});
