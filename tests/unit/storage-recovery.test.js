import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { shouldRemindBackup } from '../../src/domain/backup.js';
import {
  APP_STATE_STORAGE_KEY,
  BACKUP_SECRET_STORAGE_KEY,
  BIOMETRIC_OPT_IN_STORAGE_KEY,
  DIAGNOSTIC_ERRORS_STORAGE_KEY,
  FAMILY_SENDER_ID_STORAGE_KEY,
  PIN_ATTEMPTS_STORAGE_KEY,
  PIN_STORAGE_KEY,
  clearAllAppData,
  getSecureStorageStatus,
  resumeSecureWrites,
  securePersistStorage,
  suspendSecureWrites,
} from '../../src/utils/secureBridgeStorage.js';

const KEY = 'capital-tree-pro-v9:test-recovery';

// A stand-in for the Android bridge with the new contract: a failed write
// reports an error and leaves the old value; status reports the last problem.
const installBridge = ({ failWrites = false, status = 'ok' } = {}) => {
  const map = new Map();
  window.SystemUiBridge = {
    secureStorageGetItem: (key) => (map.has(key) ? map.get(key) : null),
    secureStorageSetItem: (key, value) => {
      if (failWrites) return 'error:encrypt';
      map.set(key, value);
      return 'ok';
    },
    secureStorageRemoveItem: (key) => map.delete(key),
    secureStorageStatus: () => status,
  };
  return map;
};

const removeBridge = () => {
  delete window.SystemUiBridge;
};

addTest('storage status is read from the bridge and defaults to ok on web', () => {
  removeBridge();
  assert.equal(getSecureStorageStatus(), 'ok');
  installBridge({ status: 'decrypt_failed' });
  assert.equal(getSecureStorageStatus(), 'decrypt_failed');
  installBridge({ status: 'something-else' });
  assert.equal(getSecureStorageStatus(), 'ok');
  removeBridge();
});

addTest('a failed native write throws and keeps the previous value', () => {
  const map = installBridge();
  securePersistStorage.setItem(KEY, 'good');
  window.SystemUiBridge.secureStorageSetItem = () => 'error:encrypt';
  assert.throws(() => securePersistStorage.setItem(KEY, 'new'), /error:encrypt/);
  assert.equal(map.get(KEY), 'good');
  removeBridge();
});

addTest('suspended writes leave saved data untouched until resumed', () => {
  const map = installBridge();
  securePersistStorage.setItem(KEY, 'user-data');
  suspendSecureWrites();
  securePersistStorage.setItem(KEY, 'empty-default');
  securePersistStorage.removeItem(KEY);
  assert.equal(map.get(KEY), 'user-data');
  resumeSecureWrites();
  securePersistStorage.setItem(KEY, 'restored');
  assert.equal(map.get(KEY), 'restored');
  removeBridge();
});

addTest('full erase delegates native secrets and clears every browser-side app key', () => {
  let nativeEraseCalls = 0;
  window.SystemUiBridge = {
    secureStorageClearAppData: () => {
      nativeEraseCalls += 1;
      return 'ok';
    },
  };
  const ownedKeys = [
    APP_STATE_STORAGE_KEY,
    `${APP_STATE_STORAGE_KEY}__bak`,
    PIN_STORAGE_KEY,
    BACKUP_SECRET_STORAGE_KEY,
    PIN_ATTEMPTS_STORAGE_KEY,
    FAMILY_SENDER_ID_STORAGE_KEY,
    BIOMETRIC_OPT_IN_STORAGE_KEY,
    DIAGNOSTIC_ERRORS_STORAGE_KEY,
  ];
  ownedKeys.forEach((key) => localStorage.setItem(key, 'sensitive'));
  localStorage.setItem('other-app:key', 'keep');

  clearAllAppData();

  assert.equal(nativeEraseCalls, 1);
  ownedKeys.forEach((key) => assert.equal(localStorage.getItem(key), null));
  assert.equal(localStorage.getItem('other-app:key'), 'keep');
  localStorage.removeItem('other-app:key');
  removeBridge();
});

addTest('full erase refuses to claim success on an older Android bridge', () => {
  window.SystemUiBridge = { secureStorageGetItem: () => null };
  assert.throws(() => clearAllAppData(), /full_erase_unavailable/);
  removeBridge();
});

addTest('backup reminder shows after two weeks once there is real history', () => {
  const now = Date.parse('2026-09-22T12:00:00Z');
  assert.equal(shouldRemindBackup(null, 5, now), false);
  assert.equal(shouldRemindBackup(null, 11, now), true);
  assert.equal(shouldRemindBackup('2026-09-10T12:00:00Z', 50, now), false);
  assert.equal(shouldRemindBackup('2026-09-01T12:00:00Z', 50, now), true);
  assert.equal(shouldRemindBackup('not a date', 50, now), true);
});

addTest('the widget mirror masks money when amounts are hidden', async () => {
  const { syncWidgetMirror } = await import('../../src/utils/widgetMirror.js');
  const written = new Map();
  window.SystemUiBridge = { widgetSetValue: (key, value) => written.set(key, value), widgetUpdate: () => {} };
  syncWidgetMirror({
    availableBalance: 123456,
    capital: 50000,
    todayExpense: 2500,
    targetCapital: 100000,
    currency: 'RUB',
    language: 'ru',
    isDarkMode: false,
    showAmounts: false,
  });
  assert.equal(written.get('available_value'), '••••');
  assert.equal(written.get('capital_value'), '••••');
  assert.equal(written.get('currency_minor'), '');
  assert.equal(written.get('progress_percent'), '50');
  assert.equal(written.get('today_expense_minor'), '2500');
  assert.equal(written.get('show_amounts'), 'false');
  removeBridge();
});

addTest('storage recovery masks stale widget money and resets progress', async () => {
  const { syncWidgetRecoveryMirror } = await import('../../src/utils/widgetMirror.js');
  const written = new Map();
  let redraws = 0;
  window.SystemUiBridge = {
    widgetSetValue: (key, value) => written.set(key, value),
    widgetUpdate: () => {
      redraws += 1;
    },
  };

  syncWidgetRecoveryMirror('ru', true);

  assert.equal(written.get('available_value'), '••••');
  assert.equal(written.get('capital_value'), '••••');
  assert.equal(written.get('target_value'), '••••');
  assert.equal(written.get('progress_text'), '0%');
  assert.equal(written.get('progress_percent'), '0');
  assert.equal(written.get('currency_minor'), '');
  assert.equal(redraws, 1);
  removeBridge();
});
