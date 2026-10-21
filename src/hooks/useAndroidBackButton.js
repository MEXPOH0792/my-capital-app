import { useEffect } from 'react';

/**
 * Wires the Android hardware back button to a layered stack of "close one
 * thing at a time" handlers. The handler list is evaluated top-down on each
 * press; the first one to return `true` consumes the press. If none consume,
 * the native default (exit the app from home) runs.
 *
 * Usage:
 *   useAndroidBackButton([
 *     () => modalOpen ? (closeModal(), true) : false,
 *     () => sidebarOpen ? (closeSidebar(), true) : false,
 *     () => activeTab !== 'home' ? (setActiveTab('home'), true) : false,
 *   ]);
 *
 * The hook degrades to a no-op on web — the @capacitor/app plugin is loaded
 * dynamically so the desktop bundle is not paying for it.
 */
export function useAndroidBackButton(layers) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let unsubscribed = false;
    let removeListener = null;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        if (unsubscribed) return;
        const handle = await App.addListener('backButton', async () => {
          for (const layer of layers) {
            if (typeof layer !== 'function') continue;
            if (layer() === true) return;
          }
          // No layer consumed the press → minimize the app instead of staying
          // on the same screen with nothing to do.
          try {
            await App.minimizeApp();
          } catch {
            /* ignore — minimizeApp is not supported on every platform */
          }
        });
        removeListener = () => handle.remove?.();
      } catch {
        // Plugin not available (web preview, missing capacitor sync) — leave
        // the browser back button alone.
      }
    })();

    return () => {
      unsubscribed = true;
      removeListener?.();
    };
  }, [layers]);
}
