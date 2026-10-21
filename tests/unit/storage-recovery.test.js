import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { shouldRemindBackup } from '../../src/domain/backup.js';
import {
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
  removeBridge();
});
