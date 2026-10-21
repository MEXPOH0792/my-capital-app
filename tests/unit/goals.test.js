import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { getDebtStrategies, getGoalJourney } from '../../src/domain/finance.js';
import { toMinorUnits } from '../../src/utils/money.js';

addTest('goal journey uses minor-unit milestones correctly', () => {
  const journey = getGoalJourney(toMinorUnits(120000), toMinorUnits(1000000));

  assert.equal(journey.previous, toMinorUnits(100000));
  assert.equal(journey.next, toMinorUnits(250000));
  assert.equal(journey.remainingToNext, toMinorUnits(130000));
});

addTest('goal journey scales milestones to a small personal goal', () => {
  // Goal of 200k: milestones must be fractions of 200k (20k/50k/100k/150k/200k),
  // never the old hardcoded amounts that marched toward 1,000,000.
  const journey = getGoalJourney(toMinorUnits(60000), toMinorUnits(200000));

  assert.deepEqual(journey.milestones, [
    toMinorUnits(20000),
    toMinorUnits(50000),
    toMinorUnits(100000),
    toMinorUnits(150000),
    toMinorUnits(200000),
  ]);
  // The final milestone is exactly the goal, not 1,000,000.
  assert.equal(journey.milestones[journey.milestones.length - 1], toMinorUnits(200000));
  assert.equal(journey.next, toMinorUnits(100000));
  assert.equal(journey.remainingToTarget, toMinorUnits(140000));
});

addTest('goal journey reports completion when capital reaches the goal', () => {
  const journey = getGoalJourney(toMinorUnits(200000), toMinorUnits(200000));

  assert.equal(journey.remainingToTarget, 0);
  assert.equal(journey.next, toMinorUnits(200000));
  assert.equal(journey.completedCount, journey.milestones.length);
});

addTest('debt strategy prefers avalanche for expensive debt', () => {
  const strategies = getDebtStrategies([
    { id: 'small', type: 'LIABILITY', status: 'ACTIVE', currentBalance: toMinorUnits(15000), interestRate: 7 },
    { id: 'expensive', type: 'LIABILITY', status: 'ACTIVE', currentBalance: toMinorUnits(120000), interestRate: 24 },
  ]);

  assert.equal(strategies.recommendedDebt?.id, 'expensive');
  assert.equal(strategies.recommendationType, 'avalanche');
});
