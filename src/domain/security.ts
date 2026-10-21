// Unlock policy: how long a wrong PIN locks the field, and when the app locks
// itself after being in the background. Pure so both rules are unit-tested.

/** Wrong PINs in a row allowed before the field pauses. */
export const FREE_PIN_ATTEMPTS = 5;
const FIRST_PAUSE_MS = 30_000;
const MAX_PAUSE_MS = 15 * 60_000;

/**
 * Pause after `failures` wrong PINs in a row: none for the first four, 30 s
 * after the fifth, then doubling with every further miss, capped at 15 min.
 */
export const getPinPauseMs = (failures: number): number => {
  const extra = Math.floor(Number(failures) || 0) - FREE_PIN_ATTEMPTS;
  if (extra < 0) return 0;
  return Math.min(MAX_PAUSE_MS, FIRST_PAUSE_MS * 2 ** extra);
};

export interface PinAttemptState {
  failures: number;
  /** Epoch ms until which input is refused; 0 when not paused. */
  lockedUntil: number;
}

export const EMPTY_PIN_ATTEMPTS: PinAttemptState = { failures: 0, lockedUntil: 0 };

export const registerPinFailure = (state: PinAttemptState, nowMs: number): PinAttemptState => {
  const failures = (Number(state?.failures) || 0) + 1;
  const pause = getPinPauseMs(failures);
  return { failures, lockedUntil: pause > 0 ? nowMs + pause : 0 };
};

export const parsePinAttempts = (raw: string | null | undefined): PinAttemptState => {
  try {
    const value = JSON.parse(String(raw ?? ''));
    const failures = Math.max(0, Math.floor(Number(value?.failures) || 0));
    const lockedUntil = Math.max(0, Number(value?.lockedUntil) || 0);
    return { failures, lockedUntil };
  } catch {
    return EMPTY_PIN_ATTEMPTS;
  }
};

/** Allowed auto-lock delays in minutes; null means never. */
export const AUTO_LOCK_OPTIONS: Array<number | null> = [0, 1, 5, null];
export const DEFAULT_AUTO_LOCK_MINUTES = 1;

export const sanitizeAutoLockMinutes = (value: unknown): number | null => {
  if (value === null) return null;
  const minutes = Number(value);
  return AUTO_LOCK_OPTIONS.includes(minutes) ? minutes : DEFAULT_AUTO_LOCK_MINUTES;
};

/** Whether returning from the background after `hiddenAtMs` should lock the app. */
export const shouldAutoLock = (hiddenAtMs: number | null, nowMs: number, minutes: number | null): boolean => {
  if (hiddenAtMs === null || minutes === null) return false;
  return nowMs - hiddenAtMs >= minutes * 60_000;
};

/** The widget hides amounts behind a PIN unless the user opted in to showing them. */
export const shouldWidgetShowAmounts = (pinEnabled: boolean, preference: boolean | null | undefined): boolean =>
  typeof preference === 'boolean' ? preference : !pinEnabled;
