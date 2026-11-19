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
const RICH_C = JSON.stringify({ state: { availableBalance: 3000, accounts: [{ id: 'c' }] } });

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

addTest('discardPending prevents an old buffered value from returning after a full erase', () => {
  const backing = createMemoryStorage();
  const storage = createDebouncedStorage(backing, 300);

  storage.setItem(KEY, RICH_A);
  storage.discardPending();
  storage.flush();

  assert.equal(backing.getItem(KEY), null);
  assert.equal(backing.getItem(`${KEY}__bak`), null);
});

addTest('a stale tab cannot overwrite a newer committed value', () => {
  const backing = createMemoryStorage();
  backing.setItem(KEY, RICH_A);
  const conflicts = [];
  const olderTab = createDebouncedStorage(backing, 300, { onConflict: (detail) => conflicts.push(detail) });
  const newerTab = createDebouncedStorage(backing, 300);

  assert.equal(olderTab.getItem(KEY), RICH_A);
  assert.equal(newerTab.getItem(KEY), RICH_A);
  newerTab.setItem(KEY, RICH_B);
  newerTab.flush();
  olderTab.setItem(KEY, RICH_C);
  olderTab.flush();

  assert.equal(backing.getItem(KEY), RICH_B);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].key, KEY);
});

addTest('a storage event discards a pending stale write before it can flush', () => {
  const backing = createMemoryStorage();
  backing.setItem(KEY, RICH_A);
  const listeners = new Map();
  const eventTarget = {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
  };
  const conflicts = [];
  const storage = createDebouncedStorage(backing, 300, {
    eventTarget,
    onConflict: (detail) => conflicts.push(detail),
  });

  assert.equal(storage.getItem(KEY), RICH_A);
  storage.setItem(KEY, RICH_C);
  backing.setItem(KEY, RICH_B);
  listeners.get('storage')?.({ key: KEY, newValue: RICH_B });
  storage.flush();

  assert.equal(backing.getItem(KEY), RICH_B);
  assert.equal(conflicts.length, 1);
  storage.destroy();
  assert.equal(listeners.has('storage'), false);
});

addTest('sequential writes from the same tab do not create a false conflict', () => {
  const backing = createMemoryStorage();
  const conflicts = [];
  const storage = createDebouncedStorage(backing, 300, { onConflict: (detail) => conflicts.push(detail) });

  storage.getItem(KEY);
  storage.setItem(KEY, RICH_A);
  storage.flush();
  storage.setItem(KEY, RICH_B);
  storage.flush();

  assert.equal(backing.getItem(KEY), RICH_B);
  assert.equal(conflicts.length, 0);
});
