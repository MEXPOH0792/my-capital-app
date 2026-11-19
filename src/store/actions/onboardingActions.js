import { ALLOCATION_MODES } from '../../domain/finance.js';
import { MIN_TARGET_MINOR, toSafeMinorAmount } from '../../utils/money.js';
import {
  createDefaultState,
  createId,
  getCurrentMonthKey,
  syncTotalsFromAccounts,
  toSafeRate,
  toSafeText,
} from '../stateHelpers.js';

export const createOnboardingActions = (set) => ({
  completeOnboarding: (payload) =>
    set((state) => {
      const nextMode = ALLOCATION_MODES[payload?.incomeDistributionMode]
        ? payload.incomeDistributionMode
        : state.incomeDistributionMode;
      const nextAccounts = state.accounts.map((account) => {
        if (!account.systemKey) return { ...account, balance: 0 };
        const nextBalance =
          account.systemKey === 'liquidPrimary'
            ? toSafeMinorAmount(payload?.startingBalances?.liquidPrimary) +
              toSafeMinorAmount(payload?.startingBalances?.liquidSecondary)
            : toSafeMinorAmount(payload?.startingBalances?.[account.systemKey]);
        return { ...account, balance: nextBalance };
      });

      const debts = Array.isArray(payload?.debts)
        ? payload.debts
            .filter(Boolean)
            .map((item) => {
              const amount = toSafeMinorAmount(item.amount);
              if (amount <= 0) return null;
              return {
                id: createId(),
                title: toSafeText(item.title, state.language === 'en' ? 'Debt' : 'Долг'),
                amount,
                initialBalance: amount,
                currentBalance: amount,
                interestRate: toSafeRate(item.interestRate),
                bankName: toSafeText(item.bankName, state.language === 'en' ? 'Private person' : 'Частное лицо'),
                type: 'LIABILITY',
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
              };
            })
            .filter(Boolean)
        : [];

      const requiredExpenses = Array.isArray(payload?.requiredExpenses)
        ? payload.requiredExpenses
            .filter(Boolean)
            .map((item) => {
              const amount = toSafeMinorAmount(item.amount);
              if (amount <= 0) return null;
              return {
                id: createId(),
                title: toSafeText(item.title, state.language === 'en' ? 'Required payment' : 'Обязательный платёж'),
                amount,
              };
            })
            .filter(Boolean)
        : [];

      return {
        isOnboardingCompleted: true,
        incomeDistributionEnabled: true,
        incomeDistributionMode: nextMode,
        allocationPercents: nextMode === 'custom' ? state.allocationPercents : ALLOCATION_MODES[nextMode].allocation,
        targetCapital: Math.max(MIN_TARGET_MINOR, toSafeMinorAmount(payload?.targetCapital) || state.targetCapital),
        targetSafety: Math.max(MIN_TARGET_MINOR, toSafeMinorAmount(payload?.targetSafety) || state.targetSafety),
        totalSadakaPaid: 0,
        debts,
        requiredExpenses,
        monthlyCoverage: { monthKey: getCurrentMonthKey(), incomeTotal: 0, requiredCovered: 0 },
        transactions: [],
        ...syncTotalsFromAccounts(nextAccounts),
      };
    }),
  resetData: () =>
    set((state) => ({
      ...createDefaultState(),
      isDarkMode: state.isDarkMode,
      language: state.language,
      securityPinHash: state.securityPinHash,
      storageSetup: state.storageSetup,
      isOnboardingCompleted: false,
      accounts: state.accounts.map((account) => ({ ...account, balance: 0 })),
    })),
});
