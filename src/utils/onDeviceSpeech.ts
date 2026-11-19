import type { SystemUiBridgeApi } from './secureBridgeStorage';

export type OnDeviceSpeechErrorCode =
  | 'unavailable'
  | 'permission_denied'
  | 'no_match'
  | 'timeout'
  | 'busy'
  | 'audio'
  | 'cancelled'
  | 'unknown';

export class OnDeviceSpeechError extends Error {
  code: OnDeviceSpeechErrorCode;

  constructor(code: OnDeviceSpeechErrorCode) {
    super(code);
    this.name = 'OnDeviceSpeechError';
    this.code = code;
  }
}

type PendingRequest = {
  resolve: (transcript: string) => void;
  reject: (error: OnDeviceSpeechError) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pendingRequests = new Map<string, PendingRequest>();
let requestSequence = 0;

const ensureCallback = (bridge: SystemUiBridgeApi): void => {
  if (bridge.__resolveOnDeviceSpeech) return;
  bridge.__resolveOnDeviceSpeech = (callbackId, status, payload) => {
    const pending = pendingRequests.get(callbackId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingRequests.delete(callbackId);
    if (status === 'ok') pending.resolve(String(payload || '').trim());
    else pending.reject(new OnDeviceSpeechError((status || 'unknown') as OnDeviceSpeechErrorCode));
  };
};

export const isOnDeviceSpeechAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.SystemUiBridge?.onDeviceSpeechAvailable?.() === true;
  } catch {
    return false;
  }
};

export const startOnDeviceSpeech = (languageTag = 'ru-RU'): Promise<string> => {
  if (typeof window === 'undefined') return Promise.reject(new OnDeviceSpeechError('unavailable'));
  const bridge = window.SystemUiBridge;
  if (!bridge?.startOnDeviceSpeech) return Promise.reject(new OnDeviceSpeechError('unavailable'));

  ensureCallback(bridge);
  const callbackId = `speech-${Date.now()}-${++requestSequence}`;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(callbackId);
      reject(new OnDeviceSpeechError('timeout'));
    }, 30_000);
    pendingRequests.set(callbackId, { resolve, reject, timeoutId });

    try {
      bridge.startOnDeviceSpeech?.(callbackId, languageTag);
    } catch {
      clearTimeout(timeoutId);
      pendingRequests.delete(callbackId);
      reject(new OnDeviceSpeechError('unknown'));
    }
  });
};
