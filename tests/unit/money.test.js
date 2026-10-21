import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { ALLOCATION_MODES, distributeIncome } from '../../src/domain/finance.js';
import {
  formatMinorAsInput,
  parseMoneyInputToMinor,
  sanitizeMoneyInput,
  splitMinorByPercents,
  toMinorUnits,
} from '../../src/utils/money.js';

addTest('money helpers convert UI rubles to stored minor units', () => {
  assert.equal(toMinorUnits(1234.56), 123456);
  assert.equal(parseMoneyInputToMinor('50 000'), 5000000);
  assert.equal(parseMoneyInputToMinor('201,1'), 20110);
  assert.equal(parseMoneyInputToMinor('201.19'), 20119);
  assert.equal(sanitizeMoneyInput('10000', 'ru-RU'), '10 000');
  assert.equal(sanitizeMoneyInput('20,', 'ru-RU'), '20,');
  assert.equal(sanitizeMoneyInput('20.1', 'ru-RU'), '20,1');
  assert.equal(formatMinorAsInput(5000000, 'ru-RU'), '50 000');
  assert.equal(formatMinorAsInput(20110, 'ru-RU'), '201,1');
});

addTest('splitMinorByPercents preserves full amount', () => {
  const result = splitMinorByPercents(10001, {
    balance: 85,
    safety: 8,
    capital: 6,
    sadaka: 1,
  });

  const total = Object.values(result).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 10001);
  assert.deepEqual(result, {
    balance: 8501,
    safety: 800,
    capital: 600,
    sadaka: 100,
  });
});

addTest('distributeIncome keeps the full amount after integer split', () => {
  const income = toMinorUnits(50000);
  const result = distributeIncome(income, ALLOCATION_MODES.base.allocation);
  const total = Object.values(result).reduce((sum, value) => sum + value, 0);

  assert.equal(total, income);
  assert.equal(result.toSadaka, toMinorUnits(500));
});
