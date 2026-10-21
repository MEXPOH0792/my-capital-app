import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { splitMinorByPercents, toMinorUnits } from '../../src/utils/money.js';

addTest('splitMinorByPercents distributes 1 leftover penny to the largest remainder', () => {
  // 100 minor split 33/33/34 → exact integer split is 33/33/34 already, no leftover.
  // Use 10 minor 33/33/34: 3 + 3 + 3 = 9, leftover 1 → goes to the largest remainder.
  const result = splitMinorByPercents(10, { a: 33, b: 33, c: 34 });
  const total = Object.values(result).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 10);
  // 34% has the largest base+remainder, so it should get the extra penny.
  assert.equal(result.c, 4);
});

addTest('splitMinorByPercents keeps total when many partial pennies accumulate', () => {
  // Construct an awkward case: 7 buckets that all round down.
  const allocation = { a: 14, b: 14, c: 14, d: 14, e: 14, f: 14, g: 16 };
  const amount = 100; // each bucket gets 14 or 16 → 14*6 + 16 = 100, no leftover.
  const result = splitMinorByPercents(amount, allocation);
  const total = Object.values(result).reduce((sum, value) => sum + value, 0);
  assert.equal(total, amount);
});

addTest('splitMinorByPercents handles 99% + 1% edge with smallest cents', () => {
  // 3 minor at 99/1 → 99% gets 2 (base) + 1 leftover = 3? No: 0.99*3 = 2.97 → base 2, remainder 0.97
  // 0.01*3 = 0.03 → base 0, remainder 0.03. Total base 2, leftover 1.
  // Larger remainder is 0.97 → goes to "balance" (99%).
  const result = splitMinorByPercents(3, { balance: 99, sadaka: 1 });
  assert.equal(result.balance + result.sadaka, 3);
  assert.equal(result.balance, 3);
  assert.equal(result.sadaka, 0);
});

addTest('splitMinorByPercents returns zeros for zero amount', () => {
  const result = splitMinorByPercents(0, { balance: 85, safety: 8, capital: 6, sadaka: 1 });
  assert.deepEqual(result, { balance: 0, safety: 0, capital: 0, sadaka: 0 });
});

addTest('splitMinorByPercents handles single-bucket allocation', () => {
  const result = splitMinorByPercents(toMinorUnits(10000), { only: 100 });
  assert.equal(result.only, toMinorUnits(10000));
});

addTest('splitMinorByPercents returns empty object when allocation has no keys', () => {
  const result = splitMinorByPercents(1000, {});
  assert.deepEqual(result, {});
});

addTest('splitMinorByPercents treats negative percents as zero', () => {
  const result = splitMinorByPercents(1000, { balance: 100, capital: -50 });
  assert.equal(result.balance, 1000);
  assert.equal(result.capital, 0);
});
