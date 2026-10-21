// Lightweight haptics wrapper.
//
// On Android via Capacitor the @capacitor/haptics plugin uses VibrationEffect
// under the hood. On web (preview/desktop) the calls become a single light
// `navigator.vibrate()` if available, or a no-op otherwise. The wrapper is
// deliberately fire-and-forget — UI code should never await haptics.

let cachedHapticsModule: typeof import('@capacitor/haptics') | null | undefined;

const loadHaptics = async (): Promise<typeof import('@capacitor/haptics') | null> => {
  if (cachedHapticsModule !== undefined) return cachedHapticsModule;
  try {
    // Dynamic import so a missing native plugin does not break the web build.
    const mod = await import('@capacitor/haptics');
    cachedHapticsModule = mod;
    return mod;
  } catch {
    cachedHapticsModule = null;
    return null;
  }
};

const webVibrate = (pattern: number | number[]): void => {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
};

export const hapticLight = (): void => {
  // Fire-and-forget. If the plugin is unavailable we degrade to a short web
  // vibration so the UX still feels responsive in preview.
  loadHaptics().then((mod) => {
    if (mod) {
      mod.Haptics.impact({ style: mod.ImpactStyle.Light }).catch(() => webVibrate(8));
    } else {
      webVibrate(8);
    }
  });
};

export const hapticMedium = (): void => {
  loadHaptics().then((mod) => {
    if (mod) {
      mod.Haptics.impact({ style: mod.ImpactStyle.Medium }).catch(() => webVibrate(15));
    } else {
      webVibrate(15);
    }
  });
};

export const hapticSuccess = (): void => {
  loadHaptics().then((mod) => {
    if (mod) {
      mod.Haptics.notification({ type: mod.NotificationType.Success }).catch(() => webVibrate([10, 30, 10]));
    } else {
      webVibrate([10, 30, 10]);
    }
  });
};

export const hapticWarning = (): void => {
  loadHaptics().then((mod) => {
    if (mod) {
      mod.Haptics.notification({ type: mod.NotificationType.Warning }).catch(() => webVibrate([20, 40, 20]));
    } else {
      webVibrate([20, 40, 20]);
    }
  });
};

export const hapticError = (): void => {
  loadHaptics().then((mod) => {
    if (mod) {
      mod.Haptics.notification({ type: mod.NotificationType.Error }).catch(() => webVibrate([30, 60, 30, 60, 30]));
    } else {
      webVibrate([30, 60, 30, 60, 30]);
    }
  });
};

export const hapticSelectionChanged = (): void => {
  // Mapped to "selection" on iOS, light tick on Android.
  loadHaptics().then((mod) => {
    if (mod) {
      mod.Haptics.selectionChanged().catch(() => webVibrate(5));
    } else {
      webVibrate(5);
    }
  });
};
