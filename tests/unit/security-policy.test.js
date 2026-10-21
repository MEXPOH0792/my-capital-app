import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  EMPTY_PIN_ATTEMPTS,
  getPinPauseMs,
  parsePinAttempts,
  registerPinFailure,
  sanitizeAutoLockMinutes,
  shouldAutoLock,
  shouldWidgetShowAmounts,
} from '../../src/domain/security.js';

addTest('wrong PINs pause after the fifth, doubling up to 15 minutes', () => {
  assert.equal(getPinPauseMs(4), 0);
  assert.equal(getPinPauseMs(5), 30_000);
  assert.equal(getPinPauseMs(6), 60_000);
  assert.equal(getPinPauseMs(7), 120_000);
  assert.equal(getPinPauseMs(20), 15 * 60_000);

  let state = EMPTY_PIN_ATTEMPTS;
  for (let i = 0; i < 5; i += 1) state = registerPinFailure(state, 1_000);
  assert.deepEqual(state, { failures: 5, lockedUntil: 31_000 });
});

addTest('stored attempt counters survive garbage', () => {
  assert.deepEqual(parsePinAttempts('{"failures":6,"lockedUntil":99}'), { failures: 6, lockedUntil: 99 });
  assert.deepEqual(parsePinAttempts('nonsense'), EMPTY_PIN_ATTEMPTS);
  assert.deepEqual(parsePinAttempts(null), EMPTY_PIN_ATTEMPTS);
});

addTest('auto-lock fires only after the chosen time in the background', () => {
  assert.equal(shouldAutoLock(0, 59_000, 1), false);
  assert.equal(shouldAutoLock(0, 60_000, 1), true);
  assert.equal(shouldAutoLock(0, 1, 0), true);
  assert.equal(shouldAutoLock(0, 10 * 60_000, null), false);
  assert.equal(shouldAutoLock(null, 10 * 60_000, 1), false);
  assert.equal(sanitizeAutoLockMinutes(7), 1);
  assert.equal(sanitizeAutoLockMinutes(null), null);
  assert.equal(sanitizeAutoLockMinutes(5), 5);
});

addTest('the widget hides amounts behind a PIN unless the user opted in', () => {
  assert.equal(shouldWidgetShowAmounts(false, null), true);
  assert.equal(shouldWidgetShowAmounts(true, null), false);
  assert.equal(shouldWidgetShowAmounts(true, true), true);
  assert.equal(shouldWidgetShowAmounts(false, false), false);
});
