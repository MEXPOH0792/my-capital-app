// Browser-side wrapper around the native `BiometricBridge` exposed by
// `MainActivity.java`. On web (preview/desktop) it falls back to "no_hardware"
// so callers can gracefully hide biometric UI.

// SystemUiBridge interface is declared in secureBridgeStorage.ts and already
// includes biometricStatus / biometricAuthenticate / __resolveBiometric.

export type BiometricStatus =
  | 'available'
  | 'no_hardware'
  | 'hw_unavailable'
  | 'none_enrolled'
  | 'security_update_required'
  | 'unsupported'
  | 'unknown';

export const isBiometricBridgeAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  const bridge = window.SystemUiBridge;
  return Boolean(bridge && typeof bridge.biometricAuthenticate === 'function');
};

export const getBiometricStatus = (): BiometricStatus => {
  if (typeof window === 'undefined') return 'no_hardware';
  const bridge = window.SystemUiBridge;
  if (!bridge || typeof bridge.biometricStatus !== 'function') return 'no_hardware';
  try {
    const raw = String(bridge.biometricStatus() || 'unknown');
    if (
      raw === 'available' ||
      raw === 'no_hardware' ||
      raw === 'hw_unavailable' ||
      raw === 'none_enrolled' ||
      raw === 'security_update_required' ||
      raw === 'unsupported'
    ) {
      return raw;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

export interface BiometricPromptOptions {
  title: string;
  subtitle?: string;
  cancelLabel?: string;
}

export type BiometricResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'lockout' | 'no_bridge' | 'error'; code?: string };

let nextCallbackId = 1;
const pendingCallbacks = new Map<string, (raw: string) => void>();

const installBridgeResolver = () => {
  if (typeof window === 'undefined') return;
  const bridge = window.SystemUiBridge;
  if (!bridge) return;
  if (typeof bridge.__resolveBiometric === 'function') return;
  bridge.__resolveBiometric = (callbackId: string, result: string) => {
    const handler = pendingCallbacks.get(callbackId);
    if (!handler) return;
    pendingCallbacks.delete(callbackId);
    handler(result);
  };
};

const parseAndroidErrorCode = (raw: string): BiometricResult => {
  // raw looks like 'error:13' or 'error:exception' or 'ok'
  if (raw === 'ok') return { ok: true };
  const code = raw.startsWith('error:') ? raw.slice(6) : raw;
  // Android codes from BiometricPrompt.ERROR_* (we surface a coarse class):
  //  10 USER_CANCELED, 13 NEGATIVE_BUTTON, 7 LOCKOUT, 9 LOCKOUT_PERMANENT
  if (code === '10' || code === '13' || code === '5' /* CANCELED */) {
    return { ok: false, reason: 'cancelled', code };
  }
  if (code === '7' || code === '9') {
    return { ok: false, reason: 'lockout', code };
  }
  return { ok: false, reason: 'error', code };
};

export const authenticateWithBiometric = async (options: BiometricPromptOptions): Promise<BiometricResult> => {
  if (!isBiometricBridgeAvailable()) return { ok: false, reason: 'no_bridge' };
  installBridgeResolver();

  const bridge = window.SystemUiBridge!;
  const callbackId = `b${Date.now()}-${nextCallbackId++}`;

  return new Promise<BiometricResult>((resolve) => {
    pendingCallbacks.set(callbackId, (raw) => resolve(parseAndroidErrorCode(raw)));
    try {
      bridge.biometricAuthenticate!(callbackId, options.title, options.subtitle ?? '', options.cancelLabel ?? 'Cancel');
    } catch {
      pendingCallbacks.delete(callbackId);
      resolve({ ok: false, reason: 'error', code: 'invoke_failed' });
    }
  });
};
