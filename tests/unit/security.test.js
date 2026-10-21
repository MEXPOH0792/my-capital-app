import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  PIN_HASH_VERSION,
  PIN_PBKDF2_ITERATIONS,
  hashPin,
  parsePinRecord,
  serializePinRecord,
  verifyPin,
  verifyPinHash,
} from '../../src/utils/security.js';

addTest('hashPin produces a v2 PBKDF2 envelope with random salt', async () => {
  const record = await hashPin('1234');
  assert.equal(record.v, PIN_HASH_VERSION);
  assert.equal(record.algo, 'pbkdf2-sha256');
  assert.equal(record.iter, PIN_PBKDF2_ITERATIONS);
  assert.match(record.salt, /^[a-f0-9]{64}$/);
  assert.match(record.hash, /^[a-f0-9]{64}$/);

  const another = await hashPin('1234');
  assert.notEqual(another.salt, record.salt);
  assert.notEqual(another.hash, record.hash);
});

addTest('verifyPin accepts the correct PIN and rejects wrong ones', async () => {
  const record = await hashPin('1234');
  const stored = serializePinRecord(record);

  const ok = await verifyPin('1234', stored);
  assert.equal(ok.ok, true);
  assert.equal(ok.needsMigration, false);

  const wrong = await verifyPin('4321', stored);
  assert.equal(wrong.ok, false);

  const empty = await verifyPin('', stored);
  assert.equal(empty.ok, false);
});

addTest('verifyPin rejects malformed envelopes without throwing', async () => {
  const malformed = '{"v":2,"algo":"unknown","iter":1,"salt":"aa","hash":"bb"}';
  const result = await verifyPin('1234', malformed);
  assert.equal(result.ok, false);
});

addTest('verifyPin migrates a legacy SHA-256 record on a successful unlock', async () => {
  // Legacy V1 stored format was sha256("capital-tree-pro:" + pin) as hex.
  // We do not export the helper, so reconstruct via WebCrypto.
  const textEncoder = new TextEncoder();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', textEncoder.encode('capital-tree-pro:1234'));
  const legacyHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  assert.match(legacyHex, /^[a-f0-9]{64}$/);

  const okWrong = await verifyPin('4321', legacyHex);
  assert.equal(okWrong.ok, false);
  assert.equal(okWrong.needsMigration, false);

  const okRight = await verifyPin('1234', legacyHex);
  assert.equal(okRight.ok, true);
  assert.equal(okRight.needsMigration, true);
  assert.ok(okRight.upgradedRecord);
  assert.equal(okRight.upgradedRecord?.v, 2);

  // Reverifying with the upgraded record (no further migration needed).
  const reverify = await verifyPin('1234', serializePinRecord(okRight.upgradedRecord));
  assert.equal(reverify.ok, true);
  assert.equal(reverify.needsMigration, false);
});

addTest('parsePinRecord returns null for legacy and invalid input', () => {
  assert.equal(parsePinRecord(''), null);
  assert.equal(parsePinRecord(null), null);
  assert.equal(parsePinRecord('a'.repeat(64)), null);
  assert.equal(parsePinRecord('not-json'), null);
  assert.equal(parsePinRecord('{"v":1}'), null);
});

addTest('verifyPinHash compatibility shim still returns boolean', async () => {
  const record = await hashPin('1234');
  const stored = serializePinRecord(record);
  assert.equal(await verifyPinHash('1234', stored), true);
  assert.equal(await verifyPinHash('4321', stored), false);
});

addTest('PBKDF2 derivation is stable for the same salt+iterations', async () => {
  const first = await hashPin('1234');
  const second = await hashPin('1234', {
    salt: Uint8Array.from(first.salt.match(/.{2}/g)?.map((b) => parseInt(b, 16)) ?? []),
    iterations: first.iter,
  });
  assert.equal(second.hash, first.hash);
});
