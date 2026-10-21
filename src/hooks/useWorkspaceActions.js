import { useCallback, useMemo, useState } from 'react';
import { parseMoneyInputToMinor } from '../utils/money.js';
import { useBackupActions } from './workspace/useBackupActions.js';
import { useFamilyActions } from './workspace/useFamilyActions.js';
import { useSecurityActions } from './workspace/useSecurityActions.js';
import { useTransactionActions } from './workspace/useTransactionActions.js';
import { useTransferActions } from './workspace/useTransferActions.js';

export function useWorkspaceActions({ store, copy, isEnglish, security, locale, fmt }) {
  const sortAccountsForSelection = useCallback(
    (accounts) =>
      [...accounts].sort((a, b) => {
        if (a.isPrimary === b.isPrimary) return 0;
        return a.isPrimary ? -1 : 1;
      }),
    [],
  );

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAdvancedDistribution, setShowAdvancedDistribution] = useState(false);
  const [allocationForm, setAllocationForm] = useState(store.allocationPercents);
  const [storageForm, setStorageForm] = useState(store.storageSetup);
  const [storageNotice, setStorageNotice] = useState('');
  const [requiredExpenseForm, setRequiredExpenseForm] = useState({ title: '', amount: '' });
  const [backupNotice, setBackupNotice] = useState('');
  const [familyNotice, setFamilyNotice] = useState('');
  const [securityForm, setSecurityForm] = useState({ pin: '', confirmPin: '' });
  const [securityNotice, setSecurityNotice] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', amount: '', includeInSpendable: false });
  const [transferForm, setTransferForm] = useState({ fromId: '', toId: '', amount: '' });
  const [selectedAccountActivityId, setSelectedAccountActivityId] = useState('');

  // These forms are editable copies of stored settings: when the store changes
  // underneath (import, reset, another screen saving), the draft has to follow.
  // Adjusting state during render is React's documented alternative to a sync
  // effect — it re-renders before committing, so the stale draft is never shown.
  const [syncedSettings, setSyncedSettings] = useState({
    allocation: store.allocationPercents,
    storage: store.storageSetup,
  });
  if (syncedSettings.allocation !== store.allocationPercents || syncedSettings.storage !== store.storageSetup) {
    setSyncedSettings({ allocation: store.allocationPercents, storage: store.storageSetup });
    if (syncedSettings.allocation !== store.allocationPercents) setAllocationForm(store.allocationPercents);
    if (syncedSettings.storage !== store.storageSetup) setStorageForm(store.storageSetup);
  }

  // The activity screen's account is derived rather than stored: an explicit
  // pick wins, anything else falls back to the primary account. Keeping it in
  // state only duplicated what the accounts list already says.
  const isActivitySelectionValid =
    Boolean(selectedAccountActivityId) && store.accounts.some((item) => item.id === selectedAccountActivityId);
  const effectiveAccountActivityId = isActivitySelectionValid
    ? selectedAccountActivityId
    : (store.accounts.find((item) => item.isPrimary) || store.accounts[0])?.id || '';

  const spendableAccounts = useMemo(
    () => sortAccountsForSelection(store.accounts.filter((item) => item.includeInSpendable)),
    [sortAccountsForSelection, store.accounts],
  );

  const allocationTotal = useMemo(
    () => Object.values(allocationForm).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [allocationForm],
  );

  const storageSplitTotal = 100;

  const handleAllocationInput = useCallback((key, value) => {
    const clean = value.replace(/\D/g, '');
    setAllocationForm((prev) => ({ ...prev, [key]: clean === '' ? 0 : parseInt(clean, 10) }));
  }, []);

  const saveAllocationSettings = useCallback(() => {
    if (allocationTotal !== 100) return;
    store.setAllocationPercents(allocationForm);
  }, [allocationForm, allocationTotal, store]);

  const handleStorageInput = useCallback((key, value) => {
    setStorageNotice('');
    setStorageForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveStorageSettings = useCallback(() => {
    store.setStorageSetup({
      ...storageForm,
      liquidSecondaryName: '',
      liquidPrimaryPercent: 100,
      liquidSecondaryPercent: 0,
    });
    setStorageNotice(isEnglish ? 'Accounts saved.' : 'Места хранения сохранены.');
    return true;
  }, [isEnglish, storageForm, store]);

  const addRequiredExpenseItem = useCallback(() => {
    const amount = parseMoneyInputToMinor(requiredExpenseForm.amount);
    if (!requiredExpenseForm.title.trim() || amount <= 0) return;
    store.addRequiredExpense(requiredExpenseForm.title, amount);
    setRequiredExpenseForm({ title: '', amount: '' });
  }, [requiredExpenseForm, store]);

  const addCustomAccount = useCallback(() => {
    const safeAmount = parseMoneyInputToMinor(accountForm.amount);
    if (!accountForm.name.trim()) return;
    store.addAccount(accountForm.name, safeAmount, accountForm.includeInSpendable);
    setAccountForm({ name: '', amount: '', includeInSpendable: false });
  }, [accountForm, store]);

  const transferActions = useTransferActions({ store, transferForm, setTransferForm });
  const transactionActions = useTransactionActions({ store, isEnglish });
  const backupActions = useBackupActions({ store, copy, isEnglish, setBackupNotice });
  const familyActions = useFamilyActions({ store, isEnglish, locale, fmt, setFamilyNotice });
  const securityActions = useSecurityActions({
    isEnglish,
    security,
    securityForm,
    setSecurityForm,
    setSecurityNotice,
  });

  return {
    showResetConfirm,
    setShowResetConfirm,
    showAdvancedDistribution,
    setShowAdvancedDistribution,
    allocationForm,
    setAllocationForm,
    storageForm,
    storageNotice,
    requiredExpenseForm,
    setRequiredExpenseForm,
    backupNotice,
    familyNotice,
    securityForm,
    setSecurityForm,
    securityNotice,
    accountForm,
    setAccountForm,
    transferForm,
    setTransferForm,
    selectedAccountActivityId: effectiveAccountActivityId,
    setSelectedAccountActivityId,
    spendableAccounts,
    allocationTotal,
    storageSplitTotal,
    handleAllocationInput,
    saveAllocationSettings,
    handleStorageInput,
    saveStorageSettings,
    addRequiredExpenseItem,
    addCustomAccount,
    ...transferActions,
    ...transactionActions,
    ...backupActions,
    ...familyActions,
    ...securityActions,
  };
}
