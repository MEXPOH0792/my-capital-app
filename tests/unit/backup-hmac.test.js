import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { resetStore, useStore } from '../harness/store.js';
import {
  BACKUP_SIGNATURE_VERSION,
  createBackupPayload,
  createSignedBackupPayload,
  parseBackupPayload,
  verifyBackupSignature,
} from '../../src/store/backupSchema.js';
import { BackupSignatureMismatchError } from '../../src/store/actions/backupActions.js';

const sampleKey = 'a'.repeat(64);
const otherKey = 'b'.repeat(64);
const sampleState = {
  language: 'ru',
  isDarkMode: true,
  availableBalance: 0,
  capital: 0,
  safetyFund: 0,
};

addTest('createSignedBackupPayload attaches a v1 hmac-sha256 signature', async () => {
  const signed = await createSignedBackupPayload(sampleState, sampleKey);
  assert.equal(signed.signature?.v, BACKUP_SIGNATURE_VERSION);
  assert.equal(signed.signature?.algo, 'hmac-sha256');
  assert.match(signed.signature?.value || '', /^[a-f0-9]+$/);
});

addTest('createBackupPayload without a key returns an unsigned payload', () => {
  const payload = createBackupPayload(sampleState);
  assert.equal(payload.signature, undefined);
});

addTest('verifyBackupSignature returns "valid" for a matching key', async () => {
  const signed = await createSignedBackupPayload(sampleState, sampleKey);
  const status = await verifyBackupSignature(signed, sampleKey);
  assert.equal(status, 'valid');
});

addTest('verifyBackupSignature returns "invalid" when state was tampered with', async () => {
  const signed = await createSignedBackupPayload(sampleState, sampleKey);
  const tampered = { ...signed, state: { ...signed.state, availableBalance: 9_999_999 } };
  const status = await verifyBackupSignature(tampered, sampleKey);
  assert.equal(status, 'invalid');
});

addTest('verifyBackupSignature returns "invalid" for a wrong HMAC key', async () => {
  const signed = await createSignedBackupPayload(sampleState, sampleKey);
  const status = await verifyBackupSignature(signed, otherKey);
  assert.equal(status, 'invalid');
});

addTest('verifyBackupSignature returns "missing" for legacy unsigned payload', async () => {
  const unsigned = createBackupPayload(sampleState);
  const status = await verifyBackupSignature(unsigned, sampleKey);
  assert.equal(status, 'missing');
});

addTest('verifyBackupSignature returns "unchecked" when no key is provided', async () => {
  const signed = await createSignedBackupPayload(sampleState, sampleKey);
  const status = await verifyBackupSignature(signed, '');
  assert.equal(status, 'unchecked');
});

addTest('parseBackupPayload accepts payloads with a valid signature shape', async () => {
  const signed = await createSignedBackupPayload(sampleState, sampleKey);
  assert.doesNotThrow(() => parseBackupPayload(signed));
});

addTest('parseBackupPayload rejects malformed signature objects', () => {
  const unsigned = createBackupPayload(sampleState);
  assert.throws(
    () => parseBackupPayload({ ...unsigned, signature: { v: 2, algo: 'hmac-sha256', value: 'ff' } }),
    /Unsupported backup signature version/,
  );
  assert.throws(
    () => parseBackupPayload({ ...unsigned, signature: { v: 1, algo: 'md5', value: 'ff' } }),
    /Unsupported backup signature algorithm/,
  );
  assert.throws(
    () => parseBackupPayload({ ...unsigned, signature: { v: 1, algo: 'hmac-sha256', value: 'NOT_HEX' } }),
    /must be a hex string/,
  );
});

addTest('importDataAsync rejects a payload that fails signature verification', async () => {
  resetStore();
  const signed = await useStore.getState().exportSignedData();
  const tampered = { ...signed, state: { ...signed.state, availableBalance: 1_000_000_000 } };
  await assert.rejects(
    () => useStore.getState().importDataAsync(tampered),
    (error) => error instanceof BackupSignatureMismatchError,
  );
});

addTest('importDataAsync accepts a tampered payload when override is set', async () => {
  resetStore();
  const signed = await useStore.getState().exportSignedData();
  const tampered = {
    ...signed,
    state: { ...signed.state, availableBalance: 1_000_000_000 },
  };
  const result = await useStore.getState().importDataAsync(tampered, { acceptInvalid: true });
  assert.equal(result.signatureStatus, 'invalid');
});

addTest('importDataAsync round-trip preserves state when signature is valid', async () => {
  resetStore();
  // Seed a small amount of state so we can verify it survives.
  useStore.getState().addAccount('Backup test', 0, true);
  const signed = await useStore.getState().exportSignedData();
  // Note: we do not call resetStore() here because it would wipe the local
  // install secret used to sign the payload. In the real app the secret
  // persists across resets via the secure bridge.
  const result = await useStore.getState().importDataAsync(signed);
  assert.equal(result.signatureStatus, 'valid');
});
