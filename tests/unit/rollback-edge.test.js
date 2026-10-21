import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  applyAccountEffects,
  applyCoverageEffect,
  applyDebtEffects,
  rollbackTransactionState,
  syncMonthlyCoverage,
} from '../../src/store/stateHelpers.js';

addTest('applyAccountEffects refuses to overdraw an account', () => {
  const accounts = [{ id: 'card', balance: 100 }];
  const effects = [{ accountId: 'card', delta: -200 }];
  const result = applyAccountEffects(accounts, effects, 1);
  assert.equal(result, null);
});

addTest('applyAccountEffects ignores entries without accountId', () => {
  const accounts = [{ id: 'card', balance: 100 }];
  const effects = [{ delta: -50 }, { accountId: 'card', delta: -10 }];
  const result = applyAccountEffects(accounts, effects, 1);
  assert.equal(result?.[0]?.balance, 90);
});

addTest('applyDebtEffects refuses to push debt above its initial balance', () => {
  const debts = [{ id: 'loan', initialBalance: 1000, currentBalance: 900 }];
  const effects = [{ debtId: 'loan', currentBalanceDelta: 200 }]; // would push to 1100 > 1000
  const result = applyDebtEffects(debts, effects, 1);
  assert.equal(result, null);
});

addTest('applyDebtEffects closes debt once balance reaches zero', () => {
  const debts = [{ id: 'loan', initialBalance: 1000, currentBalance: 100, status: 'ACTIVE' }];
  const result = applyDebtEffects(debts, [{ debtId: 'loan', currentBalanceDelta: -100 }], 1);
  assert.equal(result[0].currentBalance, 0);
  assert.equal(result[0].status, 'CLOSED');
});

addTest('applyCoverageEffect ignores stale coverage from a previous month', () => {
  const synced = syncMonthlyCoverage();
  const result = applyCoverageEffect(
    { monthKey: synced.monthKey, incomeTotal: 5000, requiredCovered: 1000 },
    { monthKey: '1999-01', incomeTotalDelta: -5000, requiredCoveredDelta: -1000 },
    1,
  );
  assert.equal(result.incomeTotal, 5000);
  assert.equal(result.requiredCovered, 1000);
});

addTest('applyCoverageEffect clamps negative coverage totals to zero', () => {
  const synced = syncMonthlyCoverage();
  const result = applyCoverageEffect(
    { monthKey: synced.monthKey, incomeTotal: 100, requiredCovered: 50 },
    { monthKey: synced.monthKey, incomeTotalDelta: -500, requiredCoveredDelta: -500 },
    1,
  );
  assert.equal(result.incomeTotal, 0);
  assert.equal(result.requiredCovered, 0);
});

addTest('rollbackTransactionState succeeds when transaction has no meta', () => {
  const state = {
    accounts: [{ id: 'card', balance: 100 }],
    debts: [],
    monthlyCoverage: syncMonthlyCoverage(),
    totalSadakaPaid: 0,
  };
  const result = rollbackTransactionState(state, { meta: null });
  assert.ok(result);
  assert.equal(result.accounts[0].balance, 100);
});

addTest('rollbackTransactionState reverses positive sadakaPaidDelta', () => {
  const state = {
    accounts: [{ id: 'sadaka', balance: 1000 }],
    debts: [],
    monthlyCoverage: syncMonthlyCoverage(),
    totalSadakaPaid: 1000,
  };
  const transaction = {
    meta: {
      effects: [{ accountId: 'sadaka', delta: 500 }],
      sadakaPaidDelta: 500,
    },
  };
  const result = rollbackTransactionState(state, transaction);
  assert.ok(result);
  assert.equal(result.accounts[0].balance, 500);
  assert.equal(result.totalSadakaPaid, 500);
});
