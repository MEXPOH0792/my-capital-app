import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useAppStore.js';
import { shouldWidgetShowAmounts } from '../domain/security.js';
import { getTodayReportedExpense } from '../domain/history.js';
import { syncWidgetMirror, syncWidgetRecoveryMirror } from '../utils/widgetMirror.js';

const SYNC_DEBOUNCE_MS = 300;

/**
 * Mirrors the small subset of store state needed by the Android home-screen
 * widget. Subscribes only to the fields the widget renders so we do not
 * re-emit on every unrelated mutation. Debounced because the widget update
 * triggers a launcher redraw — there is no point flushing on every keystroke.
 */
export function useWidgetSync({ enabled = true } = {}) {
  const fields = useStore(
    useShallow((state) => ({
      availableBalance: state.availableBalance,
      capital: state.capital,
      targetCapital: state.targetCapital,
      currency: state.currency,
      language: state.language,
      isDarkMode: state.isDarkMode,
      transactions: state.transactions,
      showAmounts: shouldWidgetShowAmounts(Boolean(state.securityPinHash), state.widgetShowAmounts),
    })),
  );
  const todayExpense = useMemo(() => getTodayReportedExpense(fields.transactions), [fields.transactions]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      syncWidgetMirror({ ...fields, todayExpense });
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    enabled,
    fields.availableBalance,
    fields.capital,
    fields.targetCapital,
    fields.currency,
    fields.language,
    fields.isDarkMode,
    todayExpense,
    fields.showAmounts,
  ]);

  // Sync immediately on first paint and when recovery finishes. While the
  // encrypted state is unreadable, mask old mirrored values instead of
  // replacing them with a misleading empty balance or leaving them exposed.
  useEffect(() => {
    if (enabled) syncWidgetMirror({ ...fields, todayExpense });
    else syncWidgetRecoveryMirror(fields.language, fields.isDarkMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
