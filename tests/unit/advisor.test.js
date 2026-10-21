import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { getAdvisorInsight } from '../../src/domain/finance.js';
import { getCopy } from '../../src/i18n.js';
import { toMinorUnits } from '../../src/utils/money.js';

const baseArgs = {
  copy: getCopy('en'),
  locale: 'en-US',
  currency: 'USD',
  incomeDistributionEnabled: true,
  incomeDistributionBasis: 'total_income',
  payYourselfPercent: 14,
  totalRequiredExpenses: toMinorUnits(20000),
  obligationsDelta: toMinorUnits(5000),
  uncoveredRequired: 0,
  topPriorityDebt: null,
  totalLiabilityDebt: 0,
  safetyFund: toMinorUnits(50000),
  targetSafety: toMinorUnits(50000),
  capital: toMinorUnits(50000),
  targetCapital: toMinorUnits(100000),
};

addTest('advisor returns disabled tone when income distribution is off', () => {
  const insight = getAdvisorInsight({ ...baseArgs, incomeDistributionEnabled: false });
  assert.equal(insight.tone, 'blue');
  assert.equal(insight.badge, baseArgs.copy.advisor.payYourself);
});

addTest('advisor returns setup tone when there are no required expenses', () => {
  const insight = getAdvisorInsight({ ...baseArgs, totalRequiredExpenses: 0 });
  assert.equal(insight.tone, 'amber');
  assert.equal(insight.badge, baseArgs.copy.advisor.setup);
});

addTest('advisor formats obligation risk amounts with the active currency, not hardcoded rouble', () => {
  const insightUsd = getAdvisorInsight({
    ...baseArgs,
    currency: 'USD',
    obligationsDelta: -toMinorUnits(5000),
  });
  // Should contain a USD-formatted gap, never the rouble symbol
  assert.equal(insightUsd.tone, 'red');
  assert.equal(insightUsd.summary.includes('₽'), false);
  assert.ok(insightUsd.summary.includes('$') || insightUsd.summary.includes('USD'));

  const insightEur = getAdvisorInsight({
    ...baseArgs,
    locale: 'de-DE',
    currency: 'EUR',
    obligationsDelta: -toMinorUnits(5000),
  });
  assert.equal(insightEur.summary.includes('₽'), false);
  assert.ok(insightEur.summary.includes('€') || insightEur.summary.includes('EUR'));
});

addTest('advisor highlights expensive debt when interest rate hits the threshold', () => {
  const insight = getAdvisorInsight({
    ...baseArgs,
    topPriorityDebt: {
      title: 'Credit card',
      interestRate: 24,
      currentBalance: toMinorUnits(120000),
    },
    totalLiabilityDebt: toMinorUnits(150000),
  });
  assert.equal(insight.tone, 'red');
  assert.equal(insight.badge, baseArgs.copy.advisor.debt);
  assert.equal(insight.summary.includes('₽'), false);
});

addTest('advisor skips expensive-debt branch when rate is below threshold', () => {
  const insight = getAdvisorInsight({
    ...baseArgs,
    topPriorityDebt: {
      title: 'Cheap loan',
      interestRate: 5,
      currentBalance: toMinorUnits(50000),
    },
    totalLiabilityDebt: toMinorUnits(50000),
  });
  assert.notEqual(insight.badge, baseArgs.copy.advisor.debt);
});

addTest('advisor warns about weak safety fund', () => {
  const insight = getAdvisorInsight({
    ...baseArgs,
    safetyFund: 0,
    targetSafety: toMinorUnits(100000),
  });
  assert.equal(insight.tone, 'amber');
  assert.equal(insight.badge, baseArgs.copy.advisor.safety);
});

addTest('advisor returns stable on a healthy plan', () => {
  const insight = getAdvisorInsight(baseArgs);
  assert.equal(insight.tone, 'green');
  assert.equal(insight.badge, baseArgs.copy.advisor.onTrack);
});

addTest('advisor reports uncovered required bills in free-after-required mode', () => {
  const insight = getAdvisorInsight({
    ...baseArgs,
    incomeDistributionBasis: 'free_after_required',
    uncoveredRequired: toMinorUnits(8000),
  });
  assert.equal(insight.tone, 'red');
  assert.equal(insight.badge, baseArgs.copy.advisor.deficit);
});
