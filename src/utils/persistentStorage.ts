// Persistent storage guard.
//
// Browsers evict Origin-Private storage (localStorage / IndexedDB) under two
// conditions that silently wipe a user's финансовые данные:
//   1. Storage pressure — when the device is low on disk the browser may clear
//      "best-effort" origins without warning.
//   2. Anti-tracking eviction — Safari/iOS clears script-writable storage for
//      sites without "persistent" grant after ~7 days of no interaction.
//
// Calling navigator.storage.persist() upgrades the origin to "persistent",
// which exempts it from both. The grant is sticky, so we only need to request
// it once; subsequent calls are cheap no-ops. On a native Capacitor build the
// data lives in encrypted SharedPreferences, so this is a web-only concern and
// the call simply resolves false where unsupported.

export type PersistenceStatus = 'persisted' | 'transient' | 'unsupported';

export const requestPersistentStorage = async (): Promise<PersistenceStatus> => {
  if (typeof navigator === 'undefined' || !navigator.storage) return 'unsupported';

  try {
    if (typeof navigator.storage.persisted === 'function') {
      const already = await navigator.storage.persisted();
      if (already) return 'persisted';
    }
    if (typeof navigator.storage.persist === 'function') {
      const granted = await navigator.storage.persist();
      return granted ? 'persisted' : 'transient';
    }
    return 'unsupported';
  } catch {
    return 'unsupported';
  }
};

export interface StorageEstimate {
  usageBytes: number | null;
  quotaBytes: number | null;
  usedPercent: number | null;
}

export const getStorageEstimate = async (): Promise<StorageEstimate> => {
  const empty: StorageEstimate = { usageBytes: null, quotaBytes: null, usedPercent: null };
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.estimate !== 'function') {
    return empty;
  }
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const usageBytes = typeof usage === 'number' ? usage : null;
    const quotaBytes = typeof quota === 'number' ? quota : null;
    const usedPercent =
      usageBytes != null && quotaBytes && quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : null;
    return { usageBytes, quotaBytes, usedPercent };
  } catch {
    return empty;
  }
};
