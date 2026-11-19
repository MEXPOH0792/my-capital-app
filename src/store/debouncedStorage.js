// Debounced + crash-safe storage wrapper.
//
// zustand's persist middleware calls setItem on every state change. On Android
// each setItem is a JS→Java bridge call that runs AES-GCM encryption and
// writes to EncryptedSharedPreferences. For state payloads of tens of KB and
// rapid action sequences (e.g. typing in a form that updates the store) this
// became the dominant source of UI jank.
//
// The wrapper:
//   1. Buffers writes per-key and flushes the latest value after a quiet
//      period (`delayMs`), forcing a final flush on page hide / before unload
//      so data is never lost on exit.
//   2. Keeps a previous-good backup copy under `${key}__bak`. Before each
//      write it promotes the currently-committed value into the backup slot,
//      then writes the new value. On read, if the primary key is missing or
//      empty (e.g. a partial/corrupt write interrupted by an app update or a
//      killed tab), it transparently recovers from the backup. This protects
//      against losing данные across updates.

const DEFAULT_DELAY_MS = 300;
const BACKUP_SUFFIX = '__bak';

const isRecoverableValue = (value) => typeof value === 'string' && value.trim().length > 2;

export const createDebouncedStorage = (storage, delayMs = DEFAULT_DELAY_MS, options = {}) => {
  // pending: key -> { kind: 'set'|'remove', value?: string, baseValue: string|null }
  const pending = new Map();
  // The committed value that this tab actually hydrated from. Comparing
  // against this value before every flush prevents an older tab from replacing
  // data written by a newer tab or by the native voice-entry flow.
  const observedCommitted = new Map();
  const conflictedKeys = new Set();
  let timer = null;

  const backupKeyFor = (key) => `${key}${BACKUP_SUFFIX}`;
  const isBackupKey = (key) => key.endsWith(BACKUP_SUFFIX);

  const targetValueFor = (action) => (action.kind === 'remove' ? null : action.value);

  const notifyConflict = (key, expectedValue, committedValue) => {
    pending.delete(key);
    if (conflictedKeys.has(key)) return;
    conflictedKeys.add(key);
    options.onConflict?.({ key, expectedValue, committedValue });
  };

  const reconcileExternalValue = (key, committedValue) => {
    if (!observedCommitted.has(key) || conflictedKeys.has(key)) return;
    const expectedValue = observedCommitted.get(key);
    if (committedValue === expectedValue) return;

    const pendingAction = pending.get(key);
    if (pendingAction && committedValue === targetValueFor(pendingAction)) {
      pending.delete(key);
      observedCommitted.set(key, committedValue);
      return;
    }
    notifyConflict(key, expectedValue, committedValue);
  };

  const checkForExternalChanges = () => {
    for (const key of observedCommitted.keys()) {
      reconcileExternalValue(key, storage.getItem(key));
    }
  };

  const flushNow = () => {
    timer = null;
    if (pending.size === 0) return;
    const snapshot = Array.from(pending.entries());
    pending.clear();
    for (const [key, action] of snapshot) {
      if (conflictedKeys.has(key)) continue;
      try {
        const committed = storage.getItem(key);
        const targetValue = targetValueFor(action);
        if (committed !== action.baseValue) {
          if (committed === targetValue) {
            observedCommitted.set(key, committed);
            continue;
          }
          notifyConflict(key, action.baseValue, committed);
          continue;
        }

        if (action.kind === 'remove') {
          // Intentionally keep the backup on remove so an accidental clear can
          // still be recovered on the next read.
          storage.removeItem(key);
        } else {
          // Promote the currently-committed value into the backup slot before
          // overwriting, so a half-written new value never destroys the last
          // known-good state.
          if (!isBackupKey(key)) {
            const committed = storage.getItem(key);
            if (isRecoverableValue(committed) && committed !== action.value) {
              try {
                storage.setItem(backupKeyFor(key), committed);
              } catch {
                /* backup is best-effort */
              }
            }
          }
          storage.setItem(key, action.value);
        }
        observedCommitted.set(key, targetValue);
      } catch (error) {
        // Surface but do not throw — losing one write should not break the app.
        if (typeof console !== 'undefined') {
          console.warn('[debouncedStorage] flush failed for', key, error);
        }
      }
    }
  };

  const scheduleFlush = () => {
    if (timer != null) return;
    timer = setTimeout(flushNow, delayMs);
  };

  // Force flush on app teardown so the latest state is durable.
  if (typeof window !== 'undefined') {
    const hardFlush = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      flushNow();
    };
    window.addEventListener('beforeunload', hardFlush);
    window.addEventListener('pagehide', hardFlush);
    document.addEventListener?.('visibilitychange', () => {
      if (document.visibilityState === 'hidden') hardFlush();
      else checkForExternalChanges();
    });
  }

  const handleStorageEvent = (event) => {
    if (event?.key === null) {
      checkForExternalChanges();
      return;
    }
    const key = event?.key;
    if (!key || isBackupKey(key)) return;
    reconcileExternalValue(key, event.newValue ?? storage.getItem(key));
  };
  options.eventTarget?.addEventListener?.('storage', handleStorageEvent);

  return {
    getItem: (key) => {
      const pendingAction = pending.get(key);
      if (pendingAction) {
        return pendingAction.kind === 'remove' ? null : pendingAction.value;
      }
      const primary = storage.getItem(key);
      observedCommitted.set(key, primary);
      if (primary != null && String(primary).length > 0) return primary;
      // Primary missing/empty — attempt recovery from the backup slot.
      if (!isBackupKey(key)) {
        const backup = storage.getItem(backupKeyFor(key));
        if (isRecoverableValue(backup)) {
          if (typeof console !== 'undefined') {
            console.warn('[debouncedStorage] recovered state from backup for', key);
          }
          return backup;
        }
      }
      return primary;
    },
    setItem: (key, value) => {
      if (conflictedKeys.has(key)) return;
      const previousPending = pending.get(key);
      const baseValue = previousPending
        ? previousPending.baseValue
        : observedCommitted.has(key)
          ? observedCommitted.get(key)
          : storage.getItem(key);
      pending.set(key, { kind: 'set', value, baseValue });
      scheduleFlush();
    },
    removeItem: (key) => {
      if (conflictedKeys.has(key)) return;
      const previousPending = pending.get(key);
      const baseValue = previousPending
        ? previousPending.baseValue
        : observedCommitted.has(key)
          ? observedCommitted.get(key)
          : storage.getItem(key);
      pending.set(key, { kind: 'remove', baseValue });
      scheduleFlush();
    },
    /**
     * Synchronously flushes all pending writes. Exposed for tests and for
     * call sites that need to guarantee durability (e.g. before export).
     */
    flush: () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      flushNow();
    },
    /** Drop buffered writes so a deliberate full erase cannot be undone later. */
    discardPending: () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      pending.clear();
    },
    checkForExternalChanges,
    destroy: () => options.eventTarget?.removeEventListener?.('storage', handleStorageEvent),
  };
};
