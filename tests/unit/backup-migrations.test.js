import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  BackupVersionError,
  CURRENT_ENVELOPE_VERSION,
  migrateBackupPayload,
} from '../../src/store/backupMigrations.js';
import { parseBackupPayload } from '../../src/store/backupSchema.js';

addTest('migrateBackupPayload is a no-op for an already-current envelope', () => {
  const payload = {
    version: CURRENT_ENVELOPE_VERSION,
    appVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    state: { language: 'ru' },
  };
  const migrated = migrateBackupPayload(payload);
  assert.equal(migrated.version, CURRENT_ENVELOPE_VERSION);
  assert.deepEqual(migrated.state, payload.state);
});

addTest('migrateBackupPayload upgrades a v1 envelope to the current version', () => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    state: { language: 'ru', moneyVersion: 1, availableBalance: 5000 },
  };
  const migrated = migrateBackupPayload(payload);
  assert.equal(migrated.version, CURRENT_ENVELOPE_VERSION);
  // The amount migration is intentionally left to sanitizeImportedState;
  // the envelope migration must not touch state contents.
  assert.equal(migrated.state.availableBalance, 5000);
});

addTest('migrateBackupPayload rejects a payload from a future app version', () => {
  assert.throws(
    () =>
      migrateBackupPayload({
        version: CURRENT_ENVELOPE_VERSION + 5,
        exportedAt: new Date().toISOString(),
        state: {},
      }),
    (error) => error instanceof BackupVersionError && error.code === 'NEWER_THAN_APP',
  );
});

addTest('migrateBackupPayload rejects a payload without a version', () => {
  assert.throws(
    () => migrateBackupPayload({ exportedAt: 'x', state: {} }),
    (error) => error instanceof BackupVersionError && error.code === 'MISSING_VERSION',
  );
});

addTest('migrateBackupPayload rejects non-object input', () => {
  assert.throws(
    () => migrateBackupPayload(null),
    (error) => error instanceof BackupVersionError && error.code === 'BAD_SHAPE',
  );
  assert.throws(
    () => migrateBackupPayload([]),
    (error) => error instanceof BackupVersionError && error.code === 'BAD_SHAPE',
  );
});

addTest('parseBackupPayload imports a v1 backup transparently', () => {
  const legacy = {
    version: 1,
    exportedAt: new Date().toISOString(),
    state: {
      language: 'ru',
      moneyVersion: 1,
      availableBalance: 1234,
    },
  };
  const parsed = parseBackupPayload(legacy);
  assert.equal(parsed.version, CURRENT_ENVELOPE_VERSION);
  assert.equal(parsed.state.availableBalance, 1234);
});
