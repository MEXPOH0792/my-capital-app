import { getAllocationTotal } from '../../domain/finance.js';
import { getCopy } from '../../i18n.js';
import {
  DEFAULT_CURRENCY,
  MIN_TARGET_MINOR,
  MONEY_VERSION,
  sanitizeCurrencyCode,
  toImportedMinorAmount,
  toMinorUnits,
} from '../../utils/money.js';
import { PIN_STORAGE_KEY, readSecureValue } from '../../utils/secureBridgeStorage.js';
import { DEFAULT_AUTO_LOCK_MINUTES, sanitizeAutoLockMinutes } from '../../domain/security.js';
import { MAX_FAMILY_REPORTS } from '../../domain/family.js';
import {
  buildAccountsFromLegacyState,
  createSystemAccounts,
  sanitizeAccounts,
  syncTotalsFromAccounts,
} from './accounts.js';
import {
  createDefaultState as createCoreDefaultState,
  createId,
  getCurrentMonthKey,
  getDefaultStorageSetup,
  normalizeAllocation,
  normalizeStorageSetup,
  syncMonthlyCoverage,
  toSafeIsoDate,
  toSafeRate,
  toSafeText,
} from './core.js';
import { relinkOrphanedPrimaryIds, sanitizeTransactions } from './transactions.js';

const getMoneyVersion = (rawState) => (rawState?.moneyVersion === MONEY_VERSION ? MONEY_VERSION : 1);

const sanitizePinHashEnvelope = (value) => {
  const raw = value == null ? '' : String(value);
  if (!raw) return '';
  // Legacy V1 record: raw 64-hex SHA-256 string. Kept until next successful unlock.
  if (/^[a-f0-9]{64}$/i.test(raw)) return raw;
  // V2 record: JSON envelope { v, algo, iter, salt, hash }.
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return '';
    if (parsed.v !== 2 || parsed.algo !== 'pbkdf2-sha256') return '';
    if (typeof parsed.iter !== 'number' || parsed.iter < 1) return '';
    if (typeof parsed.salt !== 'string' || !/^[a-f0-9]+$/i.test(parsed.salt)) return '';
    if (typeof parsed.hash !== 'string' || !/^[a-f0-9]+$/i.test(parsed.hash)) return '';
    return raw;
  } catch {
    return '';
  }
};

const sanitizeMonthlyCoverage = (coverage, isMinorState = false) => {
  const synced = syncMonthlyCoverage(coverage);
  return {
    monthKey: synced.monthKey,
    incomeTotal: toImportedMinorAmount(synced.incomeTotal, isMinorState),
    requiredCovered: toImportedMinorAmount(synced.requiredCovered, isMinorState),
  };
};

const sanitizeRequiredExpenses = (requiredExpenses, copy = getCopy('ru'), isMinorState = false) => {
  if (!Array.isArray(requiredExpenses)) return [];
  return requiredExpenses
    .filter(Boolean)
    .map((item) => ({
      id: toSafeText(item.id, createId()),
      title: toSafeText(item.title, copy.common.requiredExpense),
      amount: toImportedMinorAmount(item.amount, isMinorState),
    }))
    .filter((item) => item.amount > 0);
};

const sanitizeCategoryLimits = (categoryLimits, isMinorState = false) => {
  if (!Array.isArray(categoryLimits)) return [];
  const seen = new Set();
  return categoryLimits
    .filter(Boolean)
    .map((item) => ({
      id: toSafeText(item.id, createId()),
      category: toSafeText(item.category, ''),
      amount: toImportedMinorAmount(item.amount, isMinorState),
    }))
    .filter((item) => {
      // One ceiling per category: a duplicate would make "remaining" ambiguous.
      if (!item.category || item.amount <= 0 || seen.has(item.category)) return false;
      seen.add(item.category);
      return true;
    });
};

const sanitizeFamilyCategories = (categories, isMinorState) =>
  (Array.isArray(categories) ? categories : [])
    .filter(Boolean)
    .map((item) => ({
      category: toSafeText(item.category, ''),
      amount: toImportedMinorAmount(item.amount, isMinorState),
    }))
    .filter((item) => item.category && item.amount > 0);

const sanitizeFamilyMember = (member) => {
  if (!member || typeof member !== 'object') return null;
  const name = toSafeText(member.name, '');
  if (!name) return null;
  return {
    id: toSafeText(member.id, createId()),
    name,
    senderId: toSafeText(member.senderId, ''),
    currency: sanitizeCurrencyCode(member.currency, ''),
    addedAt: toSafeIsoDate(member.addedAt),
  };
};

const sanitizeFamilyReports = (reports, isMinorState = false) => {
  if (!Array.isArray(reports)) return [];
  const seen = new Set();
  return reports
    .filter(Boolean)
    .map((item) => ({
      monthKey: toSafeText(item.monthKey, ''),
      currency: sanitizeCurrencyCode(item.currency, ''),
      expensesTotal: toImportedMinorAmount(item.expensesTotal, isMinorState),
      categories: sanitizeFamilyCategories(item.categories, isMinorState),
      exportedAt: toSafeIsoDate(item.exportedAt),
      importedAt: toSafeIsoDate(item.importedAt),
    }))
    .filter((item) => {
      // One report per month: a duplicate would double the family total.
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(item.monthKey) || seen.has(item.monthKey)) return false;
      seen.add(item.monthKey);
      return true;
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .slice(0, MAX_FAMILY_REPORTS);
};

const sanitizeDebts = (debts, copy = getCopy('ru'), isMinorState = false) => {
  if (!Array.isArray(debts)) return [];
  return debts
    .filter(Boolean)
    .map((item) => {
      const fallbackAmount = toImportedMinorAmount(item.amount, isMinorState);
      const initialBalance = toImportedMinorAmount(item.initialBalance ?? item.amount, isMinorState);
      const currentBalance = Math.min(
        initialBalance || fallbackAmount,
        toImportedMinorAmount(item.currentBalance ?? item.amount, isMinorState),
      );
      return {
        id: toSafeText(item.id, createId()),
        title: toSafeText(item.title, copy.common.debt),
        type: item.type === 'ASSET' ? 'ASSET' : 'LIABILITY',
        addToBalance: Boolean(item.addToBalance),
        bankName: toSafeText(item.bankName, copy.common.privatePerson),
        interestRate: toSafeRate(item.interestRate),
        initialBalance: initialBalance || currentBalance,
        currentBalance,
        status: currentBalance <= 0 ? 'CLOSED' : item.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE',
        createdAt: toSafeIsoDate(item.createdAt),
      };
    })
    .filter((item) => item.initialBalance > 0);
};

const hasStoredFinancialData = (rawState, accounts = [], isMinorState = false) =>
  accounts.some((item) => toImportedMinorAmount(item.balance, true) > 0) ||
  toImportedMinorAmount(rawState?.availableBalance, isMinorState) > 0 ||
  toImportedMinorAmount(rawState?.capital, isMinorState) > 0 ||
  toImportedMinorAmount(rawState?.safetyFund, isMinorState) > 0 ||
  (Array.isArray(rawState?.transactions) && rawState.transactions.length > 0) ||
  (Array.isArray(rawState?.debts) && rawState.debts.length > 0) ||
  (Array.isArray(rawState?.requiredExpenses) && rawState.requiredExpenses.length > 0);

const sanitizeHiddenIncomePresets = (value) => {
  const safeBucket = (items) =>
    Array.isArray(items) ? items.map((item) => String(item || '').trim()).filter(Boolean) : [];
  if (!value || typeof value !== 'object') {
    return { ru: [], en: [] };
  }
  return {
    ru: safeBucket(value.ru),
    en: safeBucket(value.en),
  };
};

const sanitizeHiddenExpensePresets = (value) => {
  const safeBucket = (items) =>
    Array.isArray(items) ? items.map((item) => String(item || '').trim()).filter(Boolean) : [];
  if (!value || typeof value !== 'object') {
    return { ru: [], en: [] };
  }
  return {
    ru: safeBucket(value.ru),
    en: safeBucket(value.en),
  };
};

export const createDefaultState = () => {
  const base = createCoreDefaultState();
  const storageSetup = getDefaultStorageSetup('ru');
  return {
    ...base,
    securityPinHash: readSecureValue(PIN_STORAGE_KEY, ''),
    currency: DEFAULT_CURRENCY,
    targetCapital: toMinorUnits(1000000),
    targetSafety: toMinorUnits(500000),
    hiddenIncomePresets: { ru: [], en: [] },
    hiddenExpensePresets: { ru: [], en: [] },
    storageSetup,
    accounts: createSystemAccounts('ru', storageSetup),
    monthlyCoverage: { monthKey: getCurrentMonthKey(), incomeTotal: 0, requiredCovered: 0 },
  };
};

export const sanitizeImportedState = (rawState) => {
  const base = createDefaultState();
  const isMinorState = getMoneyVersion(rawState) === MONEY_VERSION;
  const language = ['ru', 'en'].includes(rawState?.language) ? rawState.language : base.language;
  const copy = getCopy(language);
  const nextAllocation = normalizeAllocation(rawState?.allocationPercents);
  const storageSetup = normalizeStorageSetup(rawState?.storageSetup, language);
  const migratedSadakaBalance = Array.isArray(rawState?.accounts)
    ? rawState.accounts
        .filter((item) => item?.systemKey === 'sadaka')
        .reduce((sum, item) => sum + toImportedMinorAmount(item?.balance, isMinorState), 0)
    : 0;
  const accounts = Array.isArray(rawState?.accounts)
    ? sanitizeAccounts(rawState?.accounts, language, storageSetup, isMinorState)
    : buildAccountsFromLegacyState(rawState, language);
  const syncedTotals = syncTotalsFromAccounts(accounts);

  return {
    ...base,
    isDarkMode: typeof rawState?.isDarkMode === 'boolean' ? rawState.isDarkMode : base.isDarkMode,
    language,
    currency: sanitizeCurrencyCode(rawState?.currency, base.currency),
    securityPinHash: sanitizePinHashEnvelope(rawState?.securityPinHash),
    moneyVersion: MONEY_VERSION,
    isOnboardingCompleted:
      typeof rawState?.isOnboardingCompleted === 'boolean'
        ? rawState.isOnboardingCompleted
        : hasStoredFinancialData(rawState, accounts, isMinorState),
    availableBalance: syncedTotals.availableBalance,
    safetyFund: syncedTotals.safetyFund,
    capital: syncedTotals.capital,
    totalSadakaPaid: Math.max(toImportedMinorAmount(rawState?.totalSadakaPaid, isMinorState), migratedSadakaBalance),
    autoLockMinutes:
      rawState && 'autoLockMinutes' in rawState
        ? sanitizeAutoLockMinutes(rawState.autoLockMinutes)
        : DEFAULT_AUTO_LOCK_MINUTES,
    widgetShowAmounts: typeof rawState?.widgetShowAmounts === 'boolean' ? rawState.widgetShowAmounts : null,
    lastBackupAt:
      typeof rawState?.lastBackupAt === 'string' && !Number.isNaN(new Date(rawState.lastBackupAt).getTime())
        ? rawState.lastBackupAt
        : null,
    targetCapital: Math.max(
      MIN_TARGET_MINOR,
      toImportedMinorAmount(rawState?.targetCapital, isMinorState) || base.targetCapital,
    ),
    targetSafety: Math.max(
      MIN_TARGET_MINOR,
      toImportedMinorAmount(rawState?.targetSafety, isMinorState) || base.targetSafety,
    ),
    hiddenIncomePresets: sanitizeHiddenIncomePresets(rawState?.hiddenIncomePresets),
    hiddenExpensePresets: sanitizeHiddenExpensePresets(rawState?.hiddenExpensePresets),
    incomeDistributionEnabled:
      typeof rawState?.incomeDistributionEnabled === 'boolean'
        ? rawState.incomeDistributionEnabled
        : base.incomeDistributionEnabled,
    incomeDistributionMode:
      rawState?.incomeDistributionMode && ['soft', 'base', 'growth', 'custom'].includes(rawState.incomeDistributionMode)
        ? rawState.incomeDistributionMode
        : base.incomeDistributionMode,
    incomeDistributionBasis: ['total_income', 'free_after_required'].includes(rawState?.incomeDistributionBasis)
      ? rawState.incomeDistributionBasis
      : base.incomeDistributionBasis,
    allocationPercents: getAllocationTotal(nextAllocation) === 100 ? nextAllocation : base.allocationPercents,
    storageSetup,
    accounts,
    requiredExpenses: sanitizeRequiredExpenses(rawState?.requiredExpenses, copy, isMinorState),
    categoryLimits: sanitizeCategoryLimits(rawState?.categoryLimits, isMinorState),
    monthlyCoverage: sanitizeMonthlyCoverage(rawState?.monthlyCoverage, isMinorState),
    transactions: relinkOrphanedPrimaryIds(sanitizeTransactions(rawState?.transactions, copy, isMinorState), accounts),
    debts: sanitizeDebts(rawState?.debts, copy, isMinorState),
    familyMember: sanitizeFamilyMember(rawState?.familyMember),
    familyReports: sanitizeFamilyReports(rawState?.familyReports, isMinorState),
    familySenderName: toSafeText(rawState?.familySenderName, ''),
  };
};
