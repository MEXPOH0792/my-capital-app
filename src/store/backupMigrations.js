// Backup payload migration chain.
//
// The envelope `version` field is currently coupled to `MONEY_VERSION` from
// utils/money.js — bumping one forces a new migration step here. Each entry
// is a pure function that upgrades the envelope by exactly one version. The
// chain is applied repeatedly until the envelope matches the current
// MONEY_VERSION. Newer-than-current envelopes are rejected.
//
// A note on amount scaling: sanitizeImportedState already detects legacy
// (major-units) state via the `moneyVersion` field inside `state` and
// performs the *value* migration there. The envelope migrations defined here
// only deal with the envelope itself (shape, version field, signature
// position) — they intentionally do not touch monetary amounts.

import { MONEY_VERSION } from '../utils/money.js';

export const CURRENT_ENVELOPE_VERSION = MONEY_VERSION;

/**
 * Migration[i] upgrades an envelope from version (i + 1) to version (i + 2).
 * Length of array = MONEY_VERSION - 1.
 */
const MIGRATIONS = [
  // v1 → v2: V1 envelopes had no signature and stored amounts in major units.
  // The amount migration is handled inside sanitizeImportedState. Here we
  // simply bump the envelope version so parseBackupPayload accepts the file.
  (payload) => ({ ...payload, version: 2 }),
];

export class BackupVersionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'BackupVersionError';
    this.code = code;
  }
}

/**
 * Apply the migration chain to bring `payload` up to the current envelope
 * version. Throws BackupVersionError when the file is newer than the app
 * understands, or when an intermediate step is missing.
 */
export const migrateBackupPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BackupVersionError('Backup payload must be an object', 'BAD_SHAPE');
  }
  const initialVersion = payload.version;
  if (!Number.isInteger(initialVersion) || initialVersion < 1) {
    throw new BackupVersionError('Backup version is required', 'MISSING_VERSION');
  }
  if (initialVersion > CURRENT_ENVELOPE_VERSION) {
    throw new BackupVersionError(
      `Backup was made by a newer version (v${initialVersion}). Update the app to import it.`,
      'NEWER_THAN_APP',
    );
  }

  let current = payload;
  while (current.version < CURRENT_ENVELOPE_VERSION) {
    const step = MIGRATIONS[current.version - 1];
    if (typeof step !== 'function') {
      throw new BackupVersionError(`Missing migration step from v${current.version}`, 'MISSING_STEP');
    }
    const next = step(current);
    if (!next || typeof next !== 'object' || next.version <= current.version) {
      throw new BackupVersionError(`Migration from v${current.version} did not advance the version`, 'NO_PROGRESS');
    }
    current = next;
  }
  return current;
};

/**
 * Returns the highest envelope version this build can produce/parse.
 * Exposed for tests and diagnostics.
 */
export const getCurrentBackupEnvelopeVersion = () => CURRENT_ENVELOPE_VERSION;
