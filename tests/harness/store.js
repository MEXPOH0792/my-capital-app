// Store-level helpers shared by every test that mutates state: resetStore,
// completeBaseOnboarding, getSystemAccount. The store module is imported lazily
// (after harness/setup.js installs DOM + localStorage shims) so the test
// entrypoint is responsible for `import './harness/setup.js'` first.

import { toMinorUnits } from '../../src/utils/money.js';
import { createBackupPayload } from '../../src/store/backupSchema.js';
import { sanitizeImportedState, useStore } from '../../src/store/useAppStore.js';

export { sanitizeImportedState, useStore };

export const resetStore = () => {
  localStorage.clear();
  useStore.getState().importData(createBackupPayload({ language: 'ru', isDarkMode: true }));
  useStore.getState().resetData();
};

export const getSystemAccount = (systemKey) =>
  useStore.getState().accounts.find((item) => item.systemKey === systemKey);

export const completeBaseOnboarding = (overrides = {}) => {
  useStore.getState().completeOnboarding({
    startingBalances: {
      liquidPrimary: 0,
      liquidSecondary: 0,
      safety: 0,
      capital: 0,
      sadaka: 0,
      ...(overrides.startingBalances || {}),
    },
    debts: overrides.debts || [],
    requiredExpenses: overrides.requiredExpenses || [],
    targetSafety: overrides.targetSafety ?? toMinorUnits(500000),
    targetCapital: overrides.targetCapital ?? toMinorUnits(1000000),
    incomeDistributionMode: overrides.incomeDistributionMode || 'base',
  });
};
