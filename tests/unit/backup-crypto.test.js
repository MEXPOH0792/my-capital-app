import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  BackupDecryptionError,
  ENCRYPTED_BACKUP_KIND,
  decryptBackup,
  encryptBackup,
  isEncryptedBackupEnvelope,
} from '../../src/utils/backupCrypto.js';

const samplePayload = {
  version: 2,
  appVersion: '1.0.0',
  exportedAt: '2026-05-14T00:00:00.000Z',
  state: { language: 'ru', availableBalance: 12345 },
  signature: { v: 1, algo: 'hmac-sha256', value: 'deadbeef' },
};

addTest('encryptBackup produces a v1 envelope with fresh salt/iv', async () => {
  const a = await encryptBackup(samplePayload, 'pass-1');
  const b = await encryptBackup(samplePayload, 'pass-1');
  assert.equal(a.kind, ENCRYPTED_BACKUP_KIND);
  assert.equal(a.v, 1);
  assert.equal(a.kdf.algo, 'pbkdf2-sha256');
  assert.equal(a.cipher.algo, 'aes-256-gcm');
  assert.notEqual(a.kdf.salt, b.kdf.salt);
  assert.notEqual(a.cipher.iv, b.cipher.iv);
  assert.notEqual(a.cipher.ct, b.cipher.ct);
});

addTest('decryptBackup round-trips the original payload', async () => {
  const envelope = await encryptBackup(samplePayload, 'correct horse battery staple');
  const decrypted = await decryptBackup(envelope, 'correct horse battery staple');
  assert.deepEqual(decrypted, samplePayload);
});

addTest('decryptBackup rejects a wrong passphrase with BAD_PASSPHRASE', async () => {
  const envelope = await encryptBackup(samplePayload, 'right');
  await assert.rejects(
    () => decryptBackup(envelope, 'wrong'),
    (error) => error instanceof BackupDecryptionError && error.code === 'BAD_PASSPHRASE',
  );
});

addTest('decryptBackup rejects a non-envelope input with BAD_ENVELOPE', async () => {
  await assert.rejects(
    () => decryptBackup({ not: 'an envelope' }, 'any'),
    (error) => error instanceof BackupDecryptionError && error.code === 'BAD_ENVELOPE',
  );
  await assert.rejects(
    () => decryptBackup(null, 'any'),
    (error) => error instanceof BackupDecryptionError && error.code === 'BAD_ENVELOPE',
  );
});

addTest('decryptBackup rejects a tampered ciphertext with BAD_PASSPHRASE', async () => {
  const envelope = await encryptBackup(samplePayload, 'pw');
  // Flip a character in base64 ciphertext — GCM tag check fails.
  const tampered = {
    ...envelope,
    cipher: { ...envelope.cipher, ct: `A${envelope.cipher.ct.slice(1)}` },
  };
  await assert.rejects(
    () => decryptBackup(tampered, 'pw'),
    (error) => error instanceof BackupDecryptionError && error.code === 'BAD_PASSPHRASE',
  );
});

addTest('encryptBackup refuses an empty passphrase', async () => {
  await assert.rejects(() => encryptBackup(samplePayload, ''), /Passphrase is required/);
});

addTest('isEncryptedBackupEnvelope distinguishes encrypted from plain payloads', () => {
  assert.equal(isEncryptedBackupEnvelope({}), false);
  assert.equal(isEncryptedBackupEnvelope(samplePayload), false);
  assert.equal(
    isEncryptedBackupEnvelope({
      kind: ENCRYPTED_BACKUP_KIND,
      v: 1,
      kdf: { algo: 'pbkdf2-sha256', iter: 1, salt: 'aa' },
      cipher: { algo: 'aes-256-gcm', iv: 'bb', ct: 'cc' },
    }),
    true,
  );
});
