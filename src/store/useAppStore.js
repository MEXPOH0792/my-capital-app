import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PIN_STORAGE_KEY,
  getSecureStorageStatus,
  readSecureValue,
  suspendSecureWrites,
  writeSecureValue,
} from '../utils/secureBridgeStorage.js';
import { createDefaultState, persistStorage, sanitizeImportedState } from './stateHelpers.js';
import { createAccountActions } from './actions/accountActions.js';
import { createBackupActions } from './actions/backupActions.js';
import { createCashflowActions } from './actions/cashflowActions.js';
import { createDebtActions } from './actions/debtActions.js';
import { createFamilyActions } from './actions/familyActions.js';
import { createOnboardingActions } from './actions/onboardingActions.js';
import { createSettingsActions } from './actions/settingsActions.js';

export { sanitizeImportedState } from './stateHelpers.js';

export const useStore = create(
  persist(
    (set, get) => ({
      ...createDefaultState(),
      ...createSettingsActions(set),
      ...createAccountActions(set),
      ...createCashflowActions(set),
      ...createDebtActions(set),
      ...createFamilyActions(set),
      ...createOnboardingActions(set),
      ...createBackupActions(set, get),
    }),
    {
      name: 'capital-tree-pro-v9',
      storage: persistStorage,
      partialize: (state) => {
        // Drop the PIN hash (lives in encrypted bridge storage under its own
        // key) and any totals that are recomputed from `accounts` on rehydrate
        // via syncTotalsFromAccounts. Persisting them just inflates the write
        // payload that goes through AES-GCM on every flush.
        const {
          securityPinHash: _securityPinHash,
          availableBalance: _availableBalance,
          safetyFund: _safetyFund,
          capital: _capital,
          ...rest
        } = state;
        void _securityPinHash;
        void _availableBalance;
        void _safetyFund;
        void _capital;
        return rest;
      },
      merge: (persistedState, currentState) => {
        const sanitized = sanitizeImportedState(persistedState);
        const securePinHash = readSecureValue(PIN_STORAGE_KEY, '');

        if (!securePinHash && sanitized.securityPinHash) {
          writeSecureValue(PIN_STORAGE_KEY, sanitized.securityPinHash);
        }

        return {
          ...currentState,
          ...sanitized,
          securityPinHash: sanitized.securityPinHash || securePinHash || currentState.securityPinHash,
        };
      },
    },
  ),
);

// Hydration above is synchronous. If the native side could not decrypt the
// saved state, hold every write until the user picks restore or start over on
// the recovery screen — otherwise the empty default state would be saved.
if (getSecureStorageStatus() === 'decrypt_failed') suspendSecureWrites();
