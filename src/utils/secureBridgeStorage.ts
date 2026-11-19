export interface SystemUiBridgeApi {
  secureStorageGetItem?: (key: string) => string | null | undefined;
  /** Returns "ok" or "error:<reason>" on current builds; older builds return nothing. */
  secureStorageSetItem?: (key: string, value: string) => string | void;
  /** "ok" | "decrypt_failed" | "encrypt_failed" — last storage problem in this process. */
  secureStorageStatus?: () => string;
  secureStorageRemoveItem?: (key: string) => void;
  setDarkMode?: (isDarkMode: boolean) => void;
  biometricStatus?: () => string;
  biometricAuthenticate?: (callbackId: string, title: string, subtitle: string, cancelLabel: string) => void;
  __resolveBiometric?: (callbackId: string, result: string) => void;
  /** Write a single display string into the home-screen widget mirror. */
  widgetSetValue?: (key: string, value: string) => void;
  /** Ask the launcher to redraw all of our widgets now. */
  widgetUpdate?: () => void;
  /** Toggle FLAG_SECURE: no screenshots, blank preview in recent apps. */
  setSecureWindow?: (isSecure: boolean) => void;
}

type BridgeStorageMethods = SystemUiBridgeApi;

declare global {
  interface Window {
    SystemUiBridge?: SystemUiBridgeApi;
  }
}

export interface BridgeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const noopStorage: BridgeStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const APP_STATE_STORAGE_KEY = 'capital-tree-pro-v9';
export const PIN_STORAGE_KEY = 'capital-tree-pro-v9:pin';
export const BACKUP_SECRET_STORAGE_KEY = 'capital-tree-pro-v9:backup-secret';
export const PIN_ATTEMPTS_STORAGE_KEY = 'capital-tree-pro-v9:pin-attempts';
export const FAMILY_SENDER_ID_STORAGE_KEY = 'capital-tree-pro-v9:family-sender-id';

const getBrowserStorage = (): BridgeStorage => {
  if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage) {
    return (globalThis as { localStorage: Storage }).localStorage;
  }
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return noopStorage;
};

const getBridge = (): BridgeStorageMethods | null => {
  if (typeof window === 'undefined') return null;
  return window.SystemUiBridge || null;
};

const getBridgeStorage = (): BridgeStorage | null => {
  const bridge = getBridge();
  if (!bridge) return null;
  if (typeof bridge.secureStorageGetItem !== 'function') return null;
  if (typeof bridge.secureStorageSetItem !== 'function') return null;
  if (typeof bridge.secureStorageRemoveItem !== 'function') return null;

  return {
    getItem: (key) => {
      const value = bridge.secureStorageGetItem!(String(key));
      return value == null ? null : String(value);
    },
    setItem: (key, value) => {
      const result = bridge.secureStorageSetItem!(String(key), String(value));
      // Surface a failed write so the caller keeps the pending value and logs
      // it; the native side has left the previous value in place.
      if (typeof result === 'string' && result.startsWith('error')) throw new Error(result);
    },
    removeItem: (key) => {
      bridge.secureStorageRemoveItem!(String(key));
    },
  };
};

const getActiveStorage = (): BridgeStorage => getBridgeStorage() || getBrowserStorage();

export type SecureStorageStatus = 'ok' | 'decrypt_failed' | 'encrypt_failed';

/**
 * What the native storage reported. `decrypt_failed` means saved data could
 * not be read (e.g. the Keystore key was lost) and was set aside, not deleted.
 * The web build has no such failure mode and always reports `ok`.
 */
export const getSecureStorageStatus = (): SecureStorageStatus => {
  const bridge = getBridge();
  if (!bridge || typeof bridge.secureStorageStatus !== 'function') return 'ok';
  try {
    const status = String(bridge.secureStorageStatus());
    return status === 'decrypt_failed' || status === 'encrypt_failed' ? status : 'ok';
  } catch {
    return 'ok';
  }
};

// While the recovery screen is up nothing may be written: a default state
// saved now would sit on top of the user's data before they chose what to do.
let writesSuspended = false;

export const suspendSecureWrites = (): void => {
  writesSuspended = true;
};

export const resumeSecureWrites = (): void => {
  writesSuspended = false;
};

export const areSecureWritesSuspended = (): boolean => writesSuspended;

export const securePersistStorage: BridgeStorage = {
  getItem: (key) => getActiveStorage().getItem(key),
  setItem: (key, value) => {
    if (writesSuspended) return;
    getActiveStorage().setItem(key, value);
  },
  removeItem: (key) => {
    if (writesSuspended) return;
    getActiveStorage().removeItem(key);
  },
};

export const readSecureValue = (key: string, fallback: string = ''): string => {
  const value = securePersistStorage.getItem(key);
  if (value == null) return fallback;
  return String(value);
};

export const writeSecureValue = (key: string, value: string | null | undefined): void => {
  const normalized = String(value ?? '');
  if (!normalized) {
    securePersistStorage.removeItem(key);
    return;
  }
  securePersistStorage.setItem(key, normalized);
};

export const removeSecureValue = (key: string): void => {
  securePersistStorage.removeItem(key);
};

const toHex = (view: Uint8Array): string =>
  Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

/**
 * Read the per-install backup secret. Creates a fresh 32-byte random secret on
 * the first call and persists it via the bridge (encrypted on Android,
 * localStorage on web). The secret is used as the HMAC key for backup payloads.
 */
export const getOrCreateBackupSecret = (): string => {
  const existing = readSecureValue(BACKUP_SECRET_STORAGE_KEY, '');
  if (/^[a-f0-9]{64}$/i.test(existing)) return existing;

  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    // No secure RNG available — fall back to a derived value so signing does
    // not crash. This is only hit in environments without WebCrypto.
    const fallback = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(64, '0').slice(0, 64);
    writeSecureValue(BACKUP_SECRET_STORAGE_KEY, fallback);
    return fallback;
  }

  const buf = new Uint8Array(32);
  globalThis.crypto.getRandomValues(buf);
  const hex = toHex(buf);
  writeSecureValue(BACKUP_SECRET_STORAGE_KEY, hex);
  return hex;
};

/**
 * Stable id this install puts on the family reports it sends. Not a secret and
 * not a proof of anything: it only lets the receiving app notice that a report
 * for an existing partner suddenly arrived from a different device.
 */
export const getOrCreateFamilySenderId = (): string => {
  const existing = readSecureValue(FAMILY_SENDER_ID_STORAGE_KEY, '');
  if (/^[a-f0-9]{16}$/i.test(existing)) return existing;

  const buf = new Uint8Array(8);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  const id = toHex(buf);
  writeSecureValue(FAMILY_SENDER_ID_STORAGE_KEY, id);
  return id;
};
