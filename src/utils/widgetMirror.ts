// Android home-screen widget mirror.
//
// The native AppWidgetProvider lives in a different process and cannot read
// the WebView's localStorage / Zustand store. We solve this by writing a tiny
// set of *display strings* into a dedicated (plain) SharedPreferences file
// via the SystemUiBridge. Whenever the store changes, the JS side recomputes
// these strings and calls `bridge.widgetSetValue(key, value)`; the native
// widget reads them on its next update tick.
//
// Privacy: this is a one-way mirror of values the user already sees on
// screen — current balance, capital progress, theme. No transaction history,
// no PIN data, no debts, no install secret. While a PIN is set, amounts are
// masked unless the user explicitly opted in to showing them.

import { formatMinorAsCurrency, fromMinorUnits, type SupportedLanguage } from './money.js';
// SystemUiBridgeApi (declared in secureBridgeStorage.ts) already exposes
// widgetSetValue/widgetUpdate, so we just use the global Window type.

export interface WidgetMirrorState {
  availableBalance: number;
  capital: number;
  todayExpense: number;
  targetCapital: number;
  currency: string;
  language: SupportedLanguage | string;
  isDarkMode: boolean;
  /** When false the widget shows a mask instead of money (e.g. while a PIN is set). */
  showAmounts?: boolean;
}

const MASKED_AMOUNT = '••••';

const isBridgeAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  const bridge = window.SystemUiBridge;
  return Boolean(bridge && typeof bridge.widgetSetValue === 'function');
};

const writeKey = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  const bridge = window.SystemUiBridge;
  try {
    bridge?.widgetSetValue?.(key, value);
  } catch {
    /* never throw from a sync side-effect */
  }
};

const requestWidgetRedraw = (): void => {
  if (typeof window === 'undefined') return;
  const bridge = window.SystemUiBridge;
  try {
    bridge?.widgetUpdate?.();
  } catch {
    /* ignore */
  }
};

const localeFor = (language: string): string => (language === 'en' ? 'en-US' : 'ru-RU');

const localDateKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const capitalLabelFor = (language: string): string => (language === 'en' ? 'Capital' : 'Капитал');
const availableLabelFor = (language: string): string => (language === 'en' ? 'Available' : 'Доступно');
const incomeLabelFor = (language: string): string => (language === 'en' ? 'Income' : 'Доход');
const expenseLabelFor = (language: string): string => (language === 'en' ? 'Expense' : 'Расход');
const appTitleFor = (language: string): string => (language === 'en' ? 'My Capital' : 'Личный Капитал');

const formatProgress = (capital: number, target: number, locale: string): string => {
  if (!target || target <= 0) return '0%';
  const pct = Math.min(100, Math.max(0, Math.round((capital / target) * 100)));
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(pct) + '%';
};

/**
 * Push a fresh set of display strings to the widget mirror. Cheap to call —
 * does nothing on web and never throws.
 */
export const syncWidgetMirror = (state: WidgetMirrorState): void => {
  if (!isBridgeAvailable()) return;

  const locale = localeFor(state.language);
  // Progress in percent stays visible: it says how far along the goal is
  // without telling anyone how much money that is.
  const showAmounts = state.showAmounts !== false;
  const money = (value: number): string =>
    showAmounts ? formatMinorAsCurrency(value, locale, state.currency) : MASKED_AMOUNT;
  const balanceText = money(state.availableBalance);
  const capitalText = money(state.capital);
  const targetText = money(state.targetCapital);
  const progressText = formatProgress(state.capital, state.targetCapital, locale);
  const progressPercent =
    state.targetCapital > 0 ? Math.min(100, Math.max(0, Math.round((state.capital / state.targetCapital) * 100))) : 0;

  writeKey('app_title', appTitleFor(state.language));
  writeKey('available_label', availableLabelFor(state.language));
  writeKey('available_value', balanceText);
  writeKey('capital_label', capitalLabelFor(state.language));
  writeKey('capital_value', capitalText);
  writeKey('target_value', targetText);
  writeKey('progress_text', progressText);
  writeKey('progress_percent', String(progressPercent));
  writeKey('income_label', incomeLabelFor(state.language));
  writeKey('expense_label', expenseLabelFor(state.language));
  writeKey('theme', state.isDarkMode ? 'dark' : 'light');
  writeKey('currency_minor', showAmounts ? String(fromMinorUnits(state.availableBalance)) : '');
  writeKey('current_balance_minor', String(Math.round(state.availableBalance)));
  writeKey('capital_balance_minor', String(Math.round(state.capital)));
  writeKey('today_expense_minor', String(Math.max(0, Math.round(state.todayExpense))));
  writeKey('today_expense_date', localDateKey());
  writeKey('show_amounts', showAmounts ? 'true' : 'false');
  writeKey('language', state.language === 'en' ? 'en' : 'ru');
  writeKey('currency', state.currency);
  writeKey('updated_at', new Date().toISOString());

  requestWidgetRedraw();
};

/** Masks stale native widget values while encrypted app data is unreadable. */
export const syncWidgetRecoveryMirror = (language: string = 'ru', isDarkMode: boolean = true): void => {
  syncWidgetMirror({
    availableBalance: 0,
    capital: 0,
    todayExpense: 0,
    targetCapital: 0,
    currency: 'RUB',
    language,
    isDarkMode,
    showAmounts: false,
  });
};

export const isWidgetMirrorActive = (): boolean => isBridgeAvailable();
