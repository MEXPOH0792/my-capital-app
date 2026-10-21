import { createJSONStorage } from 'zustand/middleware';
import { ALLOCATION_MODES } from '../../domain/finance.js';
import { DEFAULT_CURRENCY, MONEY_VERSION } from '../../utils/money.js';
import { securePersistStorage } from '../../utils/secureBridgeStorage.js';
import { createDebouncedStorage } from '../debouncedStorage.js';

export const getDefaultStorageSetup = (language = 'ru') => ({
  liquidPrimaryName: language === 'en' ? 'Spending account' : 'Основной счёт',
  liquidSecondaryName: '',
  liquidPrimaryPercent: 100,
  liquidSecondaryPercent: 0,
  safetyName: language === 'en' ? 'Emergency fund' : 'Копилка: подушка',
  capitalName: language === 'en' ? 'Capital bucket' : 'Копилка: капитал',
  sadakaName: language === 'en' ? 'Sadaka charity' : 'Садака',
});

export const normalizeAllocation = (allocation) => ({
  balance: Math.max(0, Number(allocation?.balance) || 0),
  safety: Math.max(0, Number(allocation?.safety) || 0),
  capital: Math.max(0, Number(allocation?.capital) || 0),
  sadaka: Math.max(0, Number(allocation?.sadaka) || 0),
});

export const toSafeText = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

export const toSafeIsoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export const toSafeRate = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

export const normalizeStorageSetup = (storageSetup, language = 'ru') => {
  const defaults = getDefaultStorageSetup(language);
  const legacyPrimaryNames = new Set(language === 'en' ? ['Card'] : ['Карта']);
  const rawPrimaryName = toSafeText(storageSetup?.liquidPrimaryName, defaults.liquidPrimaryName);

  return {
    liquidPrimaryName: legacyPrimaryNames.has(rawPrimaryName) ? defaults.liquidPrimaryName : rawPrimaryName,
    liquidSecondaryName: '',
    liquidPrimaryPercent: 100,
    liquidSecondaryPercent: 0,
    safetyName: toSafeText(storageSetup?.safetyName, defaults.safetyName),
    capitalName: toSafeText(storageSetup?.capitalName, defaults.capitalName),
    sadakaName: toSafeText(storageSetup?.sadakaName, defaults.sadakaName),
  };
};

export const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const syncMonthlyCoverage = (coverage) => {
  const monthKey = getCurrentMonthKey();
  if (!coverage || coverage.monthKey !== monthKey) {
    return { monthKey, incomeTotal: 0, requiredCovered: 0 };
  }
  return coverage;
};

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// The raw bridge storage is wrapped in a debounced layer so rapid action
// sequences (e.g. typing in a form) coalesce into a single encrypted write
// after 300ms of quiet, instead of one write per keystroke. The wrapper
// installs a pagehide/beforeunload listener to flush before the app exits.
export const persistStorage = createJSONStorage(() => createDebouncedStorage(securePersistStorage, 300));

export const createDefaultState = () => ({
  isDarkMode: true,
  language: 'ru',
  currency: DEFAULT_CURRENCY,
  securityPinHash: '',
  isOnboardingCompleted: false,
  moneyVersion: MONEY_VERSION,
  availableBalance: 0,
  safetyFund: 0,
  capital: 0,
  totalSadakaPaid: 0,
  // ISO time of the last successful backup export; drives the reminder card.
  lastBackupAt: null,
  // Minutes in the background before the PIN is asked again; null = never.
  autoLockMinutes: 1,
  // null = follow the PIN: amounts hidden on the widget while a PIN is set.
  widgetShowAmounts: null,
  // Family budget: the partner and the months they shared. Never mixed into
  // accounts or totals — the report screen is the only consumer.
  familyMember: null,
  familyReports: [],
  // Name this device puts on the reports it sends out.
  familySenderName: '',
  targetCapital: 100000000,
  targetSafety: 50000000,
  incomeDistributionEnabled: true,
  incomeDistributionMode: 'base',
  incomeDistributionBasis: 'total_income',
  allocationPercents: { ...ALLOCATION_MODES.base.allocation },
  storageSetup: getDefaultStorageSetup('ru'),
  accounts: [],
  requiredExpenses: [],
  categoryLimits: [],
  monthlyCoverage: { monthKey: getCurrentMonthKey(), incomeTotal: 0, requiredCovered: 0 },
  transactions: [],
  debts: [],
});
