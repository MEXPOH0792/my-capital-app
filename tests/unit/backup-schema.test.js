import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { resetStore, useStore } from '../harness/store.js';
import { APP_VERSION } from '../../src/app/appVersion.js';
import { createBackupPayload, parseBackupPayload } from '../../src/store/backupSchema.js';
import { MONEY_VERSION } from '../../src/utils/money.js';
import { PIN_STORAGE_KEY } from '../../src/utils/secureBridgeStorage.js';
import { createDefaultState } from '../../src/store/stateHelpers.js';

addTest('backup schema rejects payload without version', () => {
  assert.throws(() => parseBackupPayload({ state: {} }), /Backup version is required/);
});

addTest('backup schema rejects unsupported version', () => {
  // v999 is newer than this build — migrateBackupPayload refuses to downgrade.
  assert.throws(
    () => parseBackupPayload({ version: 999, exportedAt: new Date().toISOString(), state: {} }),
    /newer version/i,
  );
});

addTest('importData rejects broken backup payload', () => {
  resetStore();
  assert.throws(
    () => useStore.getState().importData({ version: MONEY_VERSION, exportedAt: 'broken-date', state: {} }),
    /exportedAt must be a valid ISO date/,
  );
});

addTest('exportData returns strict backup envelope', () => {
  resetStore();
  localStorage.removeItem(PIN_STORAGE_KEY);
  useStore.getState().setSecurityPinHash('secure-pin-hash');
  const payload = useStore.getState().exportData();
  assert.equal(payload.version, MONEY_VERSION);
  assert.equal(payload.appVersion, APP_VERSION);
  assert.ok(typeof payload.exportedAt === 'string');
  assert.ok(payload.state && typeof payload.state === 'object');
  assert.doesNotThrow(() => parseBackupPayload(payload));
  assert.equal('securityPinHash' in payload.state, false);
  localStorage.removeItem(PIN_STORAGE_KEY);
});

addTest('createDefaultState reads security pin from secure storage key', () => {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.setItem(PIN_STORAGE_KEY, 'stored-pin-hash');
  const state = createDefaultState();
  assert.equal(state.securityPinHash, 'stored-pin-hash');
  localStorage.removeItem(PIN_STORAGE_KEY);
});

addTest('backup schema accepts custom account with null systemKey', () => {
  assert.doesNotThrow(() =>
    parseBackupPayload({
      version: MONEY_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      state: {
        accounts: [
          {
            id: 'custom-account',
            name: 'Мой счёт',
            balance: 1000,
            includeInSpendable: true,
            isPrimary: false,
            isSystem: false,
            systemKey: null,
          },
        ],
      },
    }),
  );
});

// Touch createBackupPayload to keep the import surface intact when this file is
// the only one referencing the schema helpers.
createBackupPayload({ language: 'ru' });
