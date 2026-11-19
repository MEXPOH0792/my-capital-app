import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { createDebouncedStorage } from '../../src/store/debouncedStorage.js';

const createMemoryStorage = () => {
  const map = new Map();
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
};

const KEY = 'capital-tree-pro-v9';
const RICH_A = JSON.stringify({ state: { availableBalance: 1000, accounts: [{ id: 'a' }] } });
const RICH_B = JSON.stringify({ state: { availableBalance: 2000, accounts: [{ id: 'a' }, { id: 'b' }] } });

addTest('debounced storage flushes the latest buffered value', () => {
  const backing = createMemoryStorage();
  const storage = createDebouncedStorage(backing, 300);
  storage.setItem(KEY, RICH_A);
  storage.setItem(KEY, RICH_B);
  // Nothing committed yet (debounced) — but getItem sees the pending value.
  assert.equal(storage.getItem(KEY), RICH_B);
  storage.flush();
  assert.equal(backing.getItem(KEY), RICH_B);
});

addTest('debounced storage keeps a previous-good backup before overwriting', () => {
  const backing = createMemoryStorage();
  const storage = createDebouncedStorage(backing, 300);

  storage.setItem(KEY, RICH_A);
  storage.flush();
  assert.equal(backing.getItem(KEY), RICH_A);
  assert.equal(backing.getItem(`${KEY}__bak`), null); // no prior value to back up yet

  storage.setItem(KEY, RICH_B);
  storage.flush();
  assert.equal(backing.getItem(KEY), RICH_B);
  // The previous committed value (RICH_A) is now preserved in the backup slot.
  assert.equal(backing.getItem(`${KEY}__bak`), RICH_A);
});

addTest('debounced storage recovers from backup when the primary value is lost', () => {
  const backing = createMemoryStorage();
  const storage = createDebouncedStorage(backing, 300);

  storage.setItem(KEY, RICH_A);
  storage.flush();
  storage.setItem(KEY, RICH_B);
  storage.flush();

  // Simulate a corrupt/partial write or eviction of just the primary key
  // (e.g. interrupted by an app update) while the backup survives.
  backing.removeItem(KEY);

  // Fresh wrapper (new session after the update) reads through to recovery.
  const reopened = createDebouncedStorage(backing, 300);
  assert.equal(reopened.getItem(KEY), RICH_A);
});

addTest('debounced storage does not create a backup for trivial/empty values', () => {
  const backing = createMemoryStorage();
  const storage = createDebouncedStorage(backing, 300);

  storage.setItem(KEY, '{}');
  storage.flush();
  storage.setItem(KEY, RICH_A);
  storage.flush();

  // The trivial "{}" must not have been promoted to backup.
  assert.equal(backing.getItem(`${KEY}__bak`), null);
});

addTest('debounced storage keeps backup intact after a removeItem', () => {
  const backing = createMemoryStorage();
  const storage = createDebouncedStorage(backing, 300);

  storage.setItem(KEY, RICH_A);
  storage.flush();
  storage.setItem(KEY, RICH_B);
  storage.flush();
  storage.removeItem(KEY);
  storage.flush();

  assert.equal(backing.getItem(KEY), null);
  // Backup preserved so an accidental clear can be recovered.
  assert.equal(backing.getItem(`${KEY}__bak`), RICH_A);
  assert.equal(storage.getItem(KEY), RICH_A);
});
