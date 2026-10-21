import { ALLOCATION_MODES, getAllocationTotal } from '../../domain/finance.js';
import { sanitizeAutoLockMinutes } from '../../domain/security.js';
import {
  getOtherSpendableTotal,
  normalizeAllocation,
  normalizeStorageSetup,
  renameSystemAccounts,
  setLiquidSystemBalances,
  setSystemAccountBalance,
  syncTotalsFromAccounts,
} from '../stateHelpers.js';
import { MIN_TARGET_MINOR, sanitizeCurrencyCode, toSafeMinorAmount } from '../../utils/money.js';
import { PIN_STORAGE_KEY, removeSecureValue, writeSecureValue } from '../../utils/secureBridgeStorage.js';

export const createSettingsActions = (set) => ({
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setAutoLockMinutes: (minutes) => set({ autoLockMinutes: sanitizeAutoLockMinutes(minutes) }),
  setWidgetShowAmounts: (value) => set({ widgetShowAmounts: typeof value === 'boolean' ? value : null }),
  setLanguage: (language) => set((state) => (['ru', 'en'].includes(language) ? { language } : state)),
  setCurrency: (currency) =>
    set((state) => {
      const normalized = sanitizeCurrencyCode(currency, '');
      if (!normalized) return state;
      return { currency: normalized };
    }),
  setSecurityPinHash: (hash) =>
    set(() => {
      const normalized = String(hash || '');
      writeSecureValue(PIN_STORAGE_KEY, normalized);
      return { securityPinHash: normalized };
    }),
  clearSecurityPinHash: () =>
    set(() => {
      removeSecureValue(PIN_STORAGE_KEY);
      return { securityPinHash: '' };
    }),
  hideIncomePreset: (language, preset) =>
    set((state) => {
      if (!['ru', 'en'].includes(language)) return {};
      const normalizedPreset = String(preset || '').trim();
      if (!normalizedPreset) return {};
      const current = state.hiddenIncomePresets?.[language] || [];
      if (current.includes(normalizedPreset)) return {};
      return {
        hiddenIncomePresets: {
          ru: state.hiddenIncomePresets?.ru || [],
          en: state.hiddenIncomePresets?.en || [],
          [language]: [...current, normalizedPreset],
        },
      };
    }),
  hideExpensePreset: (language, preset) =>
    set((state) => {
      if (!['ru', 'en'].includes(language)) return {};
      const normalizedPreset = String(preset || '').trim();
      if (!normalizedPreset) return {};
      const current = state.hiddenExpensePresets?.[language] || [];
      if (current.includes(normalizedPreset)) return {};
      return {
        hiddenExpensePresets: {
          ru: state.hiddenExpensePresets?.ru || [],
          en: state.hiddenExpensePresets?.en || [],
          [language]: [...current, normalizedPreset],
        },
      };
    }),
  toggleIncomeDistribution: () => set((state) => ({ incomeDistributionEnabled: !state.incomeDistributionEnabled })),
  setIncomeDistributionMode: (mode) =>
    set(() => {
      if (!ALLOCATION_MODES[mode]) return {};
      if (mode === 'custom') return { incomeDistributionMode: 'custom' };
      return { incomeDistributionMode: mode, allocationPercents: ALLOCATION_MODES[mode].allocation };
    }),
  setIncomeDistributionBasis: (basis) =>
    set(() => {
      if (!['total_income', 'free_after_required'].includes(basis)) return {};
      return { incomeDistributionBasis: basis };
    }),
  setAllocationPercents: (nextAllocation) =>
    set(() => {
      const normalized = normalizeAllocation(nextAllocation);
      if (getAllocationTotal(normalized) !== 100) return {};
      return { allocationPercents: normalized, incomeDistributionMode: 'custom' };
    }),
  setStorageSetup: (nextStorageSetup) =>
    set((state) => {
      const storageSetup = normalizeStorageSetup(nextStorageSetup, state.language);
      const accounts = renameSystemAccounts(state.accounts, storageSetup);
      return {
        storageSetup,
        ...syncTotalsFromAccounts(accounts),
      };
    }),
  /**
   * Sets or replaces the monthly ceiling for a category. One limit per
   * category, so setting it twice updates rather than stacking.
   */
  setCategoryLimit: (category, amount) =>
    set((state) => {
      const safeCategory = String(category || '').trim();
      const safeAmount = toSafeMinorAmount(amount);
      if (!safeCategory || safeAmount <= 0) return {};

      const existing = state.categoryLimits.find((item) => item.category === safeCategory);
      if (existing) {
        if (existing.amount === safeAmount) return {};
        return {
          categoryLimits: state.categoryLimits.map((item) =>
            item.category === safeCategory ? { ...item, amount: safeAmount } : item,
          ),
        };
      }

      return {
        categoryLimits: [
          ...state.categoryLimits,
          {
            id: crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            category: safeCategory,
            amount: safeAmount,
          },
        ],
      };
    }),
  removeCategoryLimit: (limitId) =>
    set((state) => {
      if (!state.categoryLimits.some((item) => item.id === limitId)) return {};
      return { categoryLimits: state.categoryLimits.filter((item) => item.id !== limitId) };
    }),
  addRequiredExpense: (title, amount) =>
    set((state) => {
      const safeTitle = String(title || '').trim();
      const safeAmount = toSafeMinorAmount(amount);
      if (!safeTitle || safeAmount <= 0) return {};
      return {
        requiredExpenses: [
          ...state.requiredExpenses,
          {
            id: crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            title: safeTitle,
            amount: safeAmount,
          },
        ],
      };
    }),
  removeRequiredExpense: (expenseId) =>
    set((state) => ({
      requiredExpenses: state.requiredExpenses.filter((item) => item.id !== expenseId),
    })),
  /**
   * Sets the total of all spendable accounts. Other spendable cards keep their
   * balances; the main account takes the difference. A target below what the
   * other cards already hold is rejected — those are corrected on Accounts.
   */
  setAvailableBalance: (value) =>
    set((state) => {
      const target = toSafeMinorAmount(value);
      const others = getOtherSpendableTotal(state.accounts);
      if (target < others) return {};
      return syncTotalsFromAccounts(setLiquidSystemBalances(state.accounts, state.storageSetup, target - others));
    }),
  setCapital: (value) =>
    set((state) =>
      syncTotalsFromAccounts(setSystemAccountBalance(state.accounts, 'capital', toSafeMinorAmount(value))),
    ),
  setSafetyFund: (value) =>
    set((state) => syncTotalsFromAccounts(setSystemAccountBalance(state.accounts, 'safety', toSafeMinorAmount(value)))),
  setTargetCapital: (value) => set({ targetCapital: Math.max(MIN_TARGET_MINOR, toSafeMinorAmount(value)) }),
  setTargetSafety: (value) => set({ targetSafety: Math.max(MIN_TARGET_MINOR, toSafeMinorAmount(value)) }),
});
