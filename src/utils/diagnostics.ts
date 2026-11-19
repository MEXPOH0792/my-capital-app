// Sanitized diagnostics snapshot for support.
//
// SAFETY CONTRACT
// ---------------
// This module MUST NOT include any of the following in its output:
//   - monetary amounts (balances, transaction amounts, debt balances, targets)
//   - account names, debt titles/bank names, category strings
//   - PIN hashes, install secrets, backup signatures
//   - free-text notes from the user
//
// It MAY include:
//   - structural counts and types (e.g. "3 accounts, 2 of them custom")
//   - boolean capability flags (biometric supported, PIN enabled)
//   - app/data version numbers
//   - last N error stack traces from ErrorBoundary
//   - system info (UA, locale, timezone)
//
// The output is JSON-serializable. Tests in tests/unit/diagnostics.test.js
// pin the contract by feeding a state with sensitive strings/amounts and
// asserting none of them appear in the serialized output.

import { APP_VERSION } from '../app/appVersion.js';
import { MONEY_VERSION } from './money.js';
import { isBiometricBridgeAvailable, getBiometricStatus } from './biometric.js';
import { getSecureStorageStatus } from './secureBridgeStorage.js';
import { readPerfMetrics } from './perfMarks.js';

export const ERROR_BUFFER_STORAGE_KEY = 'capital-tree-pro-v9:diagnostic-errors';
const MAX_BUFFERED_ERRORS = 10;

export interface BufferedError {
  /** ISO timestamp */
  at: string;
  name: string;
  message: string;
  /** Stack truncated to 4 KB so the buffer stays small. */
  stack: string;
}

const safeReadErrors = (): BufferedError[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ERROR_BUFFER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .slice(-MAX_BUFFERED_ERRORS)
      .map((entry) => ({
        at: typeof entry.at === 'string' ? entry.at : '',
        name: typeof entry.name === 'string' ? entry.name : 'Error',
        message: typeof entry.message === 'string' ? entry.message : '',
        stack: typeof entry.stack === 'string' ? entry.stack : '',
      }));
  } catch {
    return [];
  }
};

/**
 * Append an error to the persistent buffer (FIFO, max 10). Called by
 * ErrorBoundary so diagnostics can include the recent crash history.
 */
export const recordDiagnosticError = (error: unknown): void => {
  if (typeof localStorage === 'undefined') return;
  if (!error || typeof error !== 'object') return;
  const e = error as { name?: unknown; message?: unknown; stack?: unknown };
  const entry: BufferedError = {
    at: new Date().toISOString(),
    name: typeof e.name === 'string' ? e.name : 'Error',
    message: typeof e.message === 'string' ? e.message.slice(0, 500) : '',
    stack: typeof e.stack === 'string' ? e.stack.slice(0, 4096) : '',
  };
  const existing = safeReadErrors();
  const next = [...existing, entry].slice(-MAX_BUFFERED_ERRORS);
  try {
    localStorage.setItem(ERROR_BUFFER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full, fail silently */
  }
};

export const clearDiagnosticErrors = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ERROR_BUFFER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

interface StateLike {
  language?: unknown;
  currency?: unknown;
  isDarkMode?: unknown;
  isOnboardingCompleted?: unknown;
  moneyVersion?: unknown;
  incomeDistributionEnabled?: unknown;
  incomeDistributionMode?: unknown;
  incomeDistributionBasis?: unknown;
  accounts?: unknown;
  transactions?: unknown;
  debts?: unknown;
  requiredExpenses?: unknown;
  monthlyCoverage?: unknown;
  hiddenIncomePresets?: unknown;
  hiddenExpensePresets?: unknown;
  securityPinHash?: unknown;
  storageSetup?: unknown;
}

const safeArrayLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

const summarizeAccounts = (state: StateLike) => {
  if (!Array.isArray(state.accounts)) {
    return { total: 0, system: 0, custom: 0, includedInSpendable: 0, withBalance: 0 };
  }
  let system = 0;
  let custom = 0;
  let includedInSpendable = 0;
  let withBalance = 0;
  for (const item of state.accounts) {
    if (!item || typeof item !== 'object') continue;
    const a = item as { isSystem?: unknown; includeInSpendable?: unknown; balance?: unknown };
    if (a.isSystem) system += 1;
    else custom += 1;
    if (a.includeInSpendable) includedInSpendable += 1;
    if (typeof a.balance === 'number' && a.balance > 0) withBalance += 1;
  }
  return {
    total: state.accounts.length,
    system,
    custom,
    includedInSpendable,
    withBalance,
  };
};

const summarizeTransactions = (state: StateLike) => {
  if (!Array.isArray(state.transactions)) {
    return { total: 0, income: 0, expense: 0, transfer: 0, withMeta: 0, firstAt: null, lastAt: null };
  }
  let income = 0;
  let expense = 0;
  let transfer = 0;
  let withMeta = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;
  for (const item of state.transactions) {
    if (!item || typeof item !== 'object') continue;
    const t = item as { type?: unknown; meta?: unknown; date?: unknown };
    if (t.type === 'income') income += 1;
    else if (t.type === 'expense') expense += 1;
    else if (t.type === 'transfer') transfer += 1;
    if (t.meta) withMeta += 1;
    if (typeof t.date === 'string') {
      if (!firstAt || t.date < firstAt) firstAt = t.date;
      if (!lastAt || t.date > lastAt) lastAt = t.date;
    }
  }
  return { total: state.transactions.length, income, expense, transfer, withMeta, firstAt, lastAt };
};

const summarizeDebts = (state: StateLike) => {
  if (!Array.isArray(state.debts)) {
    return { total: 0, active: 0, closed: 0, liabilities: 0, assets: 0, withInterestRate: 0 };
  }
  let active = 0;
  let closed = 0;
  let liabilities = 0;
  let assets = 0;
  let withInterestRate = 0;
  for (const item of state.debts) {
    if (!item || typeof item !== 'object') continue;
    const d = item as { status?: unknown; type?: unknown; interestRate?: unknown };
    if (d.status === 'ACTIVE') active += 1;
    else if (d.status === 'CLOSED') closed += 1;
    if (d.type === 'LIABILITY') liabilities += 1;
    else if (d.type === 'ASSET') assets += 1;
    if (typeof d.interestRate === 'number' && d.interestRate > 0) withInterestRate += 1;
  }
  return { total: state.debts.length, active, closed, liabilities, assets, withInterestRate };
};

const summarizeStorageSetup = (state: StateLike) => {
  const s = state.storageSetup as Record<string, unknown> | undefined;
  if (!s || typeof s !== 'object') return { configured: false };
  return {
    configured: true,
    hasPrimaryName: Boolean(s.liquidPrimaryName),
    hasSafetyName: Boolean(s.safetyName),
    hasCapitalName: Boolean(s.capitalName),
    hasSadakaName: Boolean(s.sadakaName),
    liquidPrimaryPercent: typeof s.liquidPrimaryPercent === 'number' ? s.liquidPrimaryPercent : null,
  };
};

const summarizeSecurity = (state: StateLike, biometricEnabledLocal: boolean) => ({
  pinEnabled: Boolean(state.securityPinHash),
  pinFormat: detectPinFormat(state.securityPinHash),
  biometricBridgeAvailable: isBiometricBridgeAvailable(),
  biometricStatus: getBiometricStatus(),
  biometricEnabled: biometricEnabledLocal,
  storageStatus: getSecureStorageStatus(),
});

const detectPinFormat = (value: unknown): 'none' | 'sha256-legacy' | 'pbkdf2-v2' | 'unknown' => {
  if (!value || typeof value !== 'string') return 'none';
  if (/^[a-f0-9]{64}$/i.test(value)) return 'sha256-legacy';
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && parsed.v === 2 && parsed.algo === 'pbkdf2-sha256') {
      return 'pbkdf2-v2';
    }
  } catch {
    /* not JSON */
  }
  return 'unknown';
};

const summarizeHiddenPresets = (value: unknown) => {
  if (!value || typeof value !== 'object') return { ru: 0, en: 0 };
  const v = value as { ru?: unknown; en?: unknown };
  return {
    ru: Array.isArray(v.ru) ? v.ru.length : 0,
    en: Array.isArray(v.en) ? v.en.length : 0,
  };
};

const summarizeSystem = () => {
  if (typeof navigator === 'undefined') {
    return { platform: 'unknown' };
  }
  const ua = String(navigator.userAgent || '');
  return {
    platform: typeof navigator.platform === 'string' ? navigator.platform : 'unknown',
    userAgent: ua.slice(0, 200),
    isCapacitor: ua.includes('Capacitor') || (typeof window !== 'undefined' && Boolean(window.SystemUiBridge)),
    language: typeof navigator.language === 'string' ? navigator.language : 'unknown',
    timezone: getTimezone(),
    viewport: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : null,
  };
};

const getTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  } catch {
    return 'unknown';
  }
};

const BIOMETRIC_OPT_IN_KEY = 'capital-tree-pro-v9:biometric-enabled';

export interface DiagnosticsSnapshot {
  generatedAt: string;
  appVersion: string;
  envelope: { moneyVersionConstant: number; stateMoneyVersion: number | null };
  language: 'ru' | 'en' | 'unknown';
  currency: string;
  theme: 'dark' | 'light';
  onboardingCompleted: boolean;
  incomeDistribution: { enabled: boolean; mode: string; basis: string };
  accounts: ReturnType<typeof summarizeAccounts>;
  transactions: ReturnType<typeof summarizeTransactions>;
  debts: ReturnType<typeof summarizeDebts>;
  requiredExpenses: { total: number };
  monthlyCoverage: { hasMonthKey: boolean };
  hiddenPresets: {
    income: ReturnType<typeof summarizeHiddenPresets>;
    expense: ReturnType<typeof summarizeHiddenPresets>;
  };
  storage: ReturnType<typeof summarizeStorageSetup>;
  security: ReturnType<typeof summarizeSecurity>;
  system: ReturnType<typeof summarizeSystem>;
  recentErrors: BufferedError[];
  perfMetrics: ReturnType<typeof readPerfMetrics>;
}

/**
 * Build a sanitized snapshot of the current app state for support purposes.
 * Pass the live store state from useStore.getState().
 */
export const buildDiagnosticsSnapshot = (state: StateLike): DiagnosticsSnapshot => {
  const biometricEnabledLocal =
    typeof localStorage !== 'undefined' && localStorage.getItem(BIOMETRIC_OPT_IN_KEY) === '1';

  const language: 'ru' | 'en' | 'unknown' =
    state.language === 'ru' || state.language === 'en' ? state.language : 'unknown';
  return {
    generatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    envelope: {
      moneyVersionConstant: MONEY_VERSION,
      stateMoneyVersion: typeof state.moneyVersion === 'number' ? state.moneyVersion : null,
    },
    language,
    currency: typeof state.currency === 'string' ? state.currency : 'unknown',
    theme: state.isDarkMode ? 'dark' : 'light',
    onboardingCompleted: Boolean(state.isOnboardingCompleted),
    incomeDistribution: {
      enabled: Boolean(state.incomeDistributionEnabled),
      mode: typeof state.incomeDistributionMode === 'string' ? state.incomeDistributionMode : 'unknown',
      basis: typeof state.incomeDistributionBasis === 'string' ? state.incomeDistributionBasis : 'unknown',
    },
    accounts: summarizeAccounts(state),
    transactions: summarizeTransactions(state),
    debts: summarizeDebts(state),
    requiredExpenses: { total: safeArrayLength(state.requiredExpenses) },
    monthlyCoverage: {
      hasMonthKey: Boolean(
        state.monthlyCoverage && typeof state.monthlyCoverage === 'object'
          ? (state.monthlyCoverage as { monthKey?: unknown }).monthKey
          : false,
      ),
    },
    hiddenPresets: {
      income: summarizeHiddenPresets(state.hiddenIncomePresets),
      expense: summarizeHiddenPresets(state.hiddenExpensePresets),
    },
    storage: summarizeStorageSetup(state),
    security: summarizeSecurity(state, biometricEnabledLocal),
    system: summarizeSystem(),
    recentErrors: safeReadErrors(),
    perfMetrics: readPerfMetrics(),
  };
};

/**
 * Serialize a snapshot for sharing/clipboard. Always pretty-printed so a human
 * support reader can scan it. Output is plain text.
 */
export const serializeDiagnosticsSnapshot = (snapshot: DiagnosticsSnapshot): string =>
  JSON.stringify(snapshot, null, 2);
