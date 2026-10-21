import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useAppStore.js';
import { shouldWidgetShowAmounts } from '../domain/security.js';
import { syncWidgetMirror } from '../utils/widgetMirror.js';

const SYNC_DEBOUNCE_MS = 300;

/**
 * Mirrors the small subset of store state needed by the Android home-screen
 * widget. Subscribes only to the fields the widget renders so we do not
 * re-emit on every unrelated mutation. Debounced because the widget update
 * triggers a launcher redraw — there is no point flushing on every keystroke.
 */
export function useWidgetSync() {
  const fields = useStore(
    useShallow((state) => ({
      availableBalance: state.availableBalance,
      capital: state.capital,
      targetCapital: state.targetCapital,
      currency: state.currency,
      language: state.language,
      isDarkMode: state.isDarkMode,
      showAmounts: shouldWidgetShowAmounts(Boolean(state.securityPinHash), state.widgetShowAmounts),
    })),
  );
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      syncWidgetMirror(fields);
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    fields.availableBalance,
    fields.capital,
    fields.targetCapital,
    fields.currency,
    fields.language,
    fields.isDarkMode,
    fields.showAmounts,
  ]);

  // First-paint sync so a freshly-installed widget gets values immediately
  // without waiting for a user mutation.
  useEffect(() => {
    syncWidgetMirror(fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
