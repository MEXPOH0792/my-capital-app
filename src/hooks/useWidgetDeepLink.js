import { useEffect, useRef } from 'react';

/**
 * Listens for `my-capital://widget?action=…` deep-links produced by the
 * home-screen widget and opens the corresponding modal.
 *
 * The same handler also processes the launch URL captured when the app was
 * cold-started from the widget (App.getLaunchUrl). Subsequent taps while the
 * app is running come through the `appUrlOpen` event listener.
 *
 * Accepts a map of action → handler. Unknown actions are ignored so adding a
 * new widget button is a one-line change on the JS side.
 */
export function useWidgetDeepLink(handlers) {
  const handlersRef = useRef(handlers);
  // Keep the ref fresh after commit (react-hooks v7 forbids render-time
  // writes to ref.current).
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let removeListener = null;
    let cancelled = false;

    const dispatch = (url) => {
      if (!url || typeof url !== 'string') return;
      try {
        const parsed = new URL(url);
        if (parsed.protocol.replace(':', '') !== 'my-capital') return;
        if (parsed.host !== 'widget') return;
        const action = parsed.searchParams.get('action');
        if (!action) return;
        const handler = handlersRef.current?.[action];
        if (typeof handler === 'function') handler();
      } catch {
        /* malformed URL — ignore */
      }
    };

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        if (cancelled) return;
        const launchUrl = await App.getLaunchUrl?.();
        if (launchUrl?.url) dispatch(launchUrl.url);
        const handle = await App.addListener('appUrlOpen', (event) => dispatch(event?.url));
        removeListener = () => handle.remove?.();
      } catch {
        /* @capacitor/app missing → web build, nothing to wire */
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);
}
