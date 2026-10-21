import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getCopy } from '../i18n.js';
import { useStore } from '../store/useAppStore.js';
import { useWorkspaceFlow } from '../hooks/useWorkspaceFlow.js';
import { hashPin, serializePinRecord, verifyPin } from '../utils/security.js';
import { authenticateWithBiometric, getBiometricStatus, isBiometricBridgeAvailable } from '../utils/biometric.js';
import { hapticError, hapticSuccess } from '../utils/haptics.js';
import { EMPTY_PIN_ATTEMPTS, parsePinAttempts, registerPinFailure, shouldAutoLock } from '../domain/security.js';
import { loadBackupPayload } from '../hooks/workspace/backupFile.js';
import { requestBackupPassword } from '../utils/passwordDialog.js';
import {
  PIN_ATTEMPTS_STORAGE_KEY,
  readSecureValue,
  removeSecureValue,
  writeSecureValue,
} from '../utils/secureBridgeStorage.js';
import { THEMES, getThemeStyles } from './appTheme.js';

const BIOMETRIC_OPT_IN_KEY = 'capital-tree-pro-v9:biometric-enabled';

export function useAppShell() {
  const store = useStore(
    useShallow((state) => ({
      language: state.language,
      currency: state.currency,
      isDarkMode: state.isDarkMode,
      securityPinHash: state.securityPinHash,
      hiddenIncomePresets: state.hiddenIncomePresets,
      hiddenExpensePresets: state.hiddenExpensePresets,
      allocationPercents: state.allocationPercents,
      storageSetup: state.storageSetup,
      debts: state.debts,
      accounts: state.accounts,
      transactions: state.transactions,
      lastBackupAt: state.lastBackupAt,
      autoLockMinutes: state.autoLockMinutes,
      setAutoLockMinutes: state.setAutoLockMinutes,
      widgetShowAmounts: state.widgetShowAmounts,
      familyMember: state.familyMember,
      familyReports: state.familyReports,
      familySenderName: state.familySenderName,
      setFamilySenderName: state.setFamilySenderName,
      importFamilyReport: state.importFamilyReport,
      renameFamilyMember: state.renameFamilyMember,
      removeFamilyReport: state.removeFamilyReport,
      removeFamilyMember: state.removeFamilyMember,
      setWidgetShowAmounts: state.setWidgetShowAmounts,
      markBackupExported: state.markBackupExported,
      exportSignedData: state.exportSignedData,
      importDataAsync: state.importDataAsync,
      monthlyCoverage: state.monthlyCoverage,
      requiredExpenses: state.requiredExpenses,
      categoryLimits: state.categoryLimits,
      setCategoryLimit: state.setCategoryLimit,
      removeCategoryLimit: state.removeCategoryLimit,
      incomeDistributionEnabled: state.incomeDistributionEnabled,
      incomeDistributionBasis: state.incomeDistributionBasis,
      incomeDistributionMode: state.incomeDistributionMode,
      availableBalance: state.availableBalance,
      safetyFund: state.safetyFund,
      capital: state.capital,
      totalSadakaPaid: state.totalSadakaPaid,
      targetSafety: state.targetSafety,
      targetCapital: state.targetCapital,
      isOnboardingCompleted: state.isOnboardingCompleted,
      toggleTheme: state.toggleTheme,
      setLanguage: state.setLanguage,
      setCurrency: state.setCurrency,
      setSecurityPinHash: state.setSecurityPinHash,
      clearSecurityPinHash: state.clearSecurityPinHash,
      hideIncomePreset: state.hideIncomePreset,
      hideExpensePreset: state.hideExpensePreset,
      toggleIncomeDistribution: state.toggleIncomeDistribution,
      setIncomeDistributionMode: state.setIncomeDistributionMode,
      setIncomeDistributionBasis: state.setIncomeDistributionBasis,
      setAllocationPercents: state.setAllocationPercents,
      setStorageSetup: state.setStorageSetup,
      addAccount: state.addAccount,
      updateAccount: state.updateAccount,
      deleteAccount: state.deleteAccount,
      setAccountBalance: state.setAccountBalance,
      setPrimaryAccount: state.setPrimaryAccount,
      moveAccountPriority: state.moveAccountPriority,
      transferBetweenAccounts: state.transferBetweenAccounts,
      reverseTransfer: state.reverseTransfer,
      addRequiredExpense: state.addRequiredExpense,
      removeRequiredExpense: state.removeRequiredExpense,
      addIncome: state.addIncome,
      addExpense: state.addExpense,
      addDebt: state.addDebt,
      updateDebt: state.updateDebt,
      payDebt: state.payDebt,
      deleteDebt: state.deleteDebt,
      setAvailableBalance: state.setAvailableBalance,
      setCapital: state.setCapital,
      setSafetyFund: state.setSafetyFund,
      setTargetCapital: state.setTargetCapital,
      setTargetSafety: state.setTargetSafety,
      exportData: state.exportData,
      importData: state.importData,
      completeOnboarding: state.completeOnboarding,
      deleteTransaction: state.deleteTransaction,
      updateIncomeTransaction: state.updateIncomeTransaction,
      updateExpenseTransaction: state.updateExpenseTransaction,
      resetData: state.resetData,
    })),
  );

  const copy = getCopy(store.language);
  const isEnglish = store.language === 'en';
  const theme = store.isDarkMode ? THEMES.dark : THEMES.light;
  const styles = getThemeStyles(theme, store.isDarkMode);
  const [isLocked, setIsLocked] = useState(Boolean(store.securityPinHash));
  // Wrong-PIN counter lives in secure storage so a restart does not reset it.
  const [pinAttempts, setPinAttempts] = useState(() => parsePinAttempts(readSecureValue(PIN_ATTEMPTS_STORAGE_KEY, '')));

  const savePinAttempts = useCallback((next) => {
    setPinAttempts(next);
    if (next.failures === 0) removeSecureValue(PIN_ATTEMPTS_STORAGE_KEY);
    else writeSecureValue(PIN_ATTEMPTS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  // Auto-lock: remember when the app went to the background and ask for the
  // PIN again on return once the chosen delay has passed.
  const hiddenAtRef = useRef(null);
  const lockPolicyRef = useRef({ pinEnabled: false, minutes: 1 });
  useEffect(() => {
    lockPolicyRef.current = { pinEnabled: Boolean(store.securityPinHash), minutes: store.autoLockMinutes ?? null };
  }, [store.securityPinHash, store.autoLockMinutes]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onHidden = () => {
      if (hiddenAtRef.current === null) hiddenAtRef.current = Date.now();
    };
    const onVisible = () => {
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      const { pinEnabled, minutes } = lockPolicyRef.current;
      if (pinEnabled && shouldAutoLock(hiddenAt, Date.now(), minutes)) setIsLocked(true);
    };
    const onVisibilityChange = () => (document.visibilityState === 'hidden' ? onHidden() : onVisible());
    document.addEventListener('visibilitychange', onVisibilityChange);

    // The Android WebView does not always fire visibilitychange on
    // backgrounding, so the native app state is watched as well.
    let removeAppListener = null;
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => (isActive ? onVisible() : onHidden()));
        if (cancelled) handle.remove();
        else removeAppListener = () => handle.remove();
      } catch {
        /* web build: visibilitychange is enough */
      }
    })();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      removeAppListener?.();
    };
  }, []);

  // FLAG_SECURE while a PIN is set: no screenshots, blank recent-apps preview.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.SystemUiBridge?.setSecureWindow?.(Boolean(store.securityPinHash));
    } catch {
      /* older native build without the method */
    }
  }, [store.securityPinHash]);

  useEffect(() => {
    if (!store.securityPinHash) {
      setIsLocked(false);
    }
  }, [store.securityPinHash]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = theme.bg;
      document.body.style.backgroundColor = theme.bg;
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme.bg);
      }
    }
  }, [theme.bg]);

  // Keep <html lang> + data-theme in sync with the active language/theme so
  // screen readers pick the right pronunciation and locale-scoped tooling can
  // observe the current mode without reading from the store.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = store.language === 'en' ? 'en' : 'ru';
    document.documentElement.dataset.theme = store.isDarkMode ? 'dark' : 'light';
  }, [store.language, store.isDarkMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bridge = window.SystemUiBridge;
    if (bridge && typeof bridge.setDarkMode === 'function') {
      bridge.setDarkMode(store.isDarkMode);
    }
  }, [store.isDarkMode]);

  const enablePin = useCallback(
    async (pin) => {
      const record = await hashPin(pin);
      store.setSecurityPinHash(serializePinRecord(record));
      setIsLocked(false);
      return true;
    },
    [store],
  );

  const disablePin = useCallback(() => {
    store.clearSecurityPinHash();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(BIOMETRIC_OPT_IN_KEY);
      }
    } catch {
      /* ignore */
    }
    setIsLocked(false);
  }, [store]);

  // Biometric is gated on PIN being enabled (it is an alternative for unlock,
  // not a replacement for the master credential).
  const biometricCapability = useMemo(() => {
    if (!isBiometricBridgeAvailable()) {
      return { supported: false, status: 'no_bridge' };
    }
    const status = getBiometricStatus();
    return { supported: status === 'available', status };
  }, [store.securityPinHash]);

  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    setIsBiometricEnabled(localStorage.getItem(BIOMETRIC_OPT_IN_KEY) === '1');
  }, [store.securityPinHash]);

  const enableBiometric = useCallback(async () => {
    if (!biometricCapability.supported || !store.securityPinHash) return false;
    const result = await authenticateWithBiometric({
      title: copy.lockScreen?.biometricTitle || (isEnglish ? 'Confirm biometrics' : 'Подтвердите биометрию'),
      subtitle:
        copy.lockScreen?.biometricSubtitle || (isEnglish ? 'Required once to enable' : 'Нужно один раз для включения'),
      cancelLabel: copy.common?.cancel || (isEnglish ? 'Cancel' : 'Отмена'),
    });
    if (!result.ok) return false;
    try {
      localStorage.setItem(BIOMETRIC_OPT_IN_KEY, '1');
    } catch {
      /* ignore */
    }
    setIsBiometricEnabled(true);
    return true;
  }, [biometricCapability.supported, store.securityPinHash, copy, isEnglish]);

  const disableBiometric = useCallback(() => {
    try {
      localStorage.removeItem(BIOMETRIC_OPT_IN_KEY);
    } catch {
      /* ignore */
    }
    setIsBiometricEnabled(false);
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    if (!biometricCapability.supported || !isBiometricEnabled || !store.securityPinHash) {
      return false;
    }
    const result = await authenticateWithBiometric({
      title: copy.lockScreen?.biometricTitle || (isEnglish ? 'Unlock with biometrics' : 'Разблокировать биометрией'),
      subtitle: copy.appTitle || '',
      cancelLabel: copy.common?.cancel || (isEnglish ? 'Cancel' : 'Отмена'),
    });
    if (!result.ok) return false;
    savePinAttempts(EMPTY_PIN_ATTEMPTS);
    setIsLocked(false);
    return true;
  }, [biometricCapability.supported, isBiometricEnabled, store.securityPinHash, copy, isEnglish, savePinAttempts]);

  const lockNow = useCallback(() => {
    if (store.securityPinHash) {
      setIsLocked(true);
    }
  }, [store.securityPinHash]);

  const unlock = useCallback(
    async (pin) => {
      if (pinAttempts.lockedUntil > Date.now()) {
        hapticError();
        return false;
      }
      const result = await verifyPin(pin, store.securityPinHash);
      if (!result.ok) {
        savePinAttempts(registerPinFailure(pinAttempts, Date.now()));
        hapticError();
        return false;
      }
      savePinAttempts(EMPTY_PIN_ATTEMPTS);
      if (result.needsMigration && result.upgradedRecord) {
        // Transparently upgrade legacy SHA-256 PIN records to PBKDF2 on a
        // successful unlock so the next launch uses the strong format.
        store.setSecurityPinHash(serializePinRecord(result.upgradedRecord));
      }
      hapticSuccess();
      setIsLocked(false);
      return true;
    },
    [store, pinAttempts, savePinAttempts],
  );

  // "Forgot PIN": the PIN cannot be recovered, so the only ways past the lock
  // replace the data — wipe it, or load a backup over it. Neither reveals
  // what was protected.
  const finishForgottenPin = useCallback(() => {
    store.clearSecurityPinHash();
    savePinAttempts(EMPTY_PIN_ATTEMPTS);
    try {
      localStorage.removeItem(BIOMETRIC_OPT_IN_KEY);
    } catch {
      /* ignore */
    }
    setIsLocked(false);
  }, [store, savePinAttempts]);

  const wipeAfterForgottenPin = useCallback(() => {
    store.resetData();
    finishForgottenPin();
  }, [store, finishForgottenPin]);

  const restoreAfterForgottenPin = useCallback(
    async (file) => {
      const payload = await loadBackupPayload(file, { isEnglish, askPassword: requestBackupPassword });
      if (!payload) return false;
      await store.importDataAsync(payload, { acceptInvalid: true });
      finishForgottenPin();
      return true;
    },
    [store, isEnglish, finishForgottenPin],
  );

  const security = useMemo(
    () => ({
      pinEnabled: Boolean(store.securityPinHash),
      isLocked,
      enablePin,
      disablePin,
      lockNow,
      unlock,
      pinLockedUntil: pinAttempts.lockedUntil,
      forgotPin: { wipe: wipeAfterForgottenPin, restore: restoreAfterForgottenPin },
      biometric: {
        supported: biometricCapability.supported,
        status: biometricCapability.status,
        enabled: isBiometricEnabled && biometricCapability.supported,
        enable: enableBiometric,
        disable: disableBiometric,
        unlock: unlockWithBiometric,
      },
    }),
    [
      store.securityPinHash,
      isLocked,
      enablePin,
      disablePin,
      lockNow,
      unlock,
      pinAttempts.lockedUntil,
      wipeAfterForgottenPin,
      restoreAfterForgottenPin,
      biometricCapability,
      isBiometricEnabled,
      enableBiometric,
      disableBiometric,
      unlockWithBiometric,
    ],
  );

  const workspace = useWorkspaceFlow({ store, copy, isEnglish, security });

  return {
    store,
    copy,
    isEnglish,
    theme,
    security,
    workspace,
    ...styles,
  };
}
