import { toImportedMinorAmount, toSafeMinorAmount } from '../../utils/money.js';
import { createId, getDefaultStorageSetup, normalizeStorageSetup, toSafeText } from './core.js';

const getPrimaryAccountId = (accounts) =>
  accounts.find((item) => item.isPrimary)?.id ||
  accounts.find((item) => item.systemKey === 'liquidPrimary')?.id ||
  accounts.find((item) => item.includeInSpendable)?.id ||
  accounts[0]?.id ||
  '';

const ensureSinglePrimaryAccount = (accounts) => {
  if (!accounts.length) return accounts;
  const primaryId = getPrimaryAccountId(accounts);
  return accounts.map((account) => ({ ...account, isPrimary: account.id === primaryId }));
};

const getLegacySpendableNames = (language = 'ru') => ({
  primary: new Set(language === 'en' ? ['Card'] : ['Карта']),
  secondary: new Set(language === 'en' ? ['Cash'] : ['Наличные']),
});

const normalizeAccountName = (value) => toSafeText(value, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const getAccountMergeKey = (account) =>
  account.systemKey
    ? `system:${account.systemKey}`
    : `custom:${account.includeInSpendable ? 'spendable' : 'protected'}:${normalizeAccountName(account.name)}`;

const mergeDuplicateAccounts = (accounts) => {
  const merged = [];
  const indexByKey = new Map();

  accounts.forEach((account) => {
    const mergeKey = getAccountMergeKey(account);
    const existingIndex = indexByKey.get(mergeKey);

    if (existingIndex === undefined) {
      indexByKey.set(mergeKey, merged.length);
      merged.push({ ...account });
      return;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      balance: existing.balance + account.balance,
      isPrimary: existing.isPrimary || account.isPrimary,
      isSystem: existing.isSystem || account.isSystem,
      includeInSpendable: existing.includeInSpendable || account.includeInSpendable,
      systemKey: existing.systemKey || account.systemKey || null,
    };
  });

  return merged;
};

export const createSystemAccounts = (language = 'ru', storageSetup = getDefaultStorageSetup(language)) => [
  {
    id: createId(),
    name: storageSetup.liquidPrimaryName,
    balance: 0,
    includeInSpendable: true,
    isPrimary: true,
    isSystem: true,
    systemKey: 'liquidPrimary',
  },
  {
    id: createId(),
    name: storageSetup.safetyName,
    balance: 0,
    includeInSpendable: false,
    isPrimary: false,
    isSystem: true,
    systemKey: 'safety',
  },
  {
    id: createId(),
    name: storageSetup.capitalName,
    balance: 0,
    includeInSpendable: false,
    isPrimary: false,
    isSystem: true,
    systemKey: 'capital',
  },
  {
    id: createId(),
    name: storageSetup.sadakaName,
    balance: 0,
    includeInSpendable: false,
    isPrimary: false,
    isSystem: true,
    systemKey: 'sadaka',
  },
];

export const syncTotalsFromAccounts = (accounts) => ({
  accounts: ensureSinglePrimaryAccount(accounts),
  availableBalance: accounts.filter((item) => item.includeInSpendable).reduce((sum, item) => sum + item.balance, 0),
  safetyFund: accounts.filter((item) => item.systemKey === 'safety').reduce((sum, item) => sum + item.balance, 0),
  capital: accounts.filter((item) => item.systemKey === 'capital').reduce((sum, item) => sum + item.balance, 0),
});

export const buildAccountsFromLegacyState = (rawState, language = 'ru') => {
  const storageSetup = normalizeStorageSetup(rawState?.storageSetup, language);
  const accounts = createSystemAccounts(language, storageSetup);
  const liquidTotal = toImportedMinorAmount(rawState?.availableBalance, false);

  return accounts.map((account) => {
    if (account.systemKey === 'liquidPrimary') return { ...account, balance: liquidTotal };
    if (account.systemKey === 'safety')
      return { ...account, balance: toImportedMinorAmount(rawState?.safetyFund, false) };
    if (account.systemKey === 'capital')
      return { ...account, balance: toImportedMinorAmount(rawState?.capital, false) };
    if (account.systemKey === 'sadaka')
      return { ...account, balance: toImportedMinorAmount(rawState?.totalSadakaPaid, false) };
    return account;
  });
};

export const sanitizeAccounts = (
  accounts,
  language = 'ru',
  storageSetup = getDefaultStorageSetup(language),
  isMinorState = false,
) => {
  const defaults = createSystemAccounts(language, storageSetup);
  const legacyNames = getLegacySpendableNames(language);
  if (!Array.isArray(accounts) || accounts.length === 0) return defaults;

  let mergedLegacySpendable = 0;
  let sawLegacyPrimary = false;
  // "Карта" / "Наличные" (Card / Cash) were the spendable accounts of the
  // pre-system-accounts format. Only data in that old format is folded into
  // the main account; once a main account exists, an account with one of
  // these names is simply the user's own and must survive every reload.
  const isLegacyFormat = !accounts.some((item) => item?.systemKey === 'liquidPrimary');
  // The main account is rebuilt below from the merged spendable balances. It
  // must keep its id and place: history effects point at that id, and a new id
  // on every launch silently broke editing and rolling back old operations.
  let primaryId = null;
  let primaryIndex = -1;

  const sanitized = accounts
    .filter(Boolean)
    .map((item, index) => ({
      index,
      id: toSafeText(item.id, createId()),
      name: toSafeText(item.name, language === 'en' ? 'Account' : 'Счёт'),
      balance: toImportedMinorAmount(item.balance, isMinorState),
      includeInSpendable: Boolean(item.includeInSpendable),
      isPrimary: Boolean(item.isPrimary),
      isSystem: Boolean(item.isSystem),
      systemKey: item.systemKey || null,
    }))
    .filter((item) => {
      const isLegacyPrimary = isLegacyFormat && legacyNames.primary.has(item.name);
      const isLegacySecondary = isLegacyFormat && legacyNames.secondary.has(item.name);
      const shouldMergeIntoPrimary =
        item.includeInSpendable &&
        (item.systemKey === 'liquidPrimary' ||
          item.systemKey === 'liquidSecondary' ||
          isLegacyPrimary ||
          isLegacySecondary);

      if (!shouldMergeIntoPrimary) return true;

      if (item.systemKey === 'liquidPrimary' && primaryId === null) {
        primaryId = item.id;
        primaryIndex = item.index;
      }
      mergedLegacySpendable += item.balance;
      if (item.systemKey === 'liquidPrimary' || item.isPrimary || isLegacyPrimary) {
        sawLegacyPrimary = true;
      }
      return false;
    });

  const deduped = mergeDuplicateAccounts(sanitized.map(({ index: _index, ...item }) => item));
  const systemKeys = new Set(deduped.filter((item) => item.systemKey).map((item) => item.systemKey));

  defaults.forEach((account) => {
    if (systemKeys.has(account.systemKey)) return;
    if (account.systemKey === 'liquidPrimary' && primaryId) {
      const position = sanitized.filter((item) => item.index < primaryIndex).length;
      deduped.splice(Math.min(position, deduped.length), 0, { ...account, id: primaryId });
      return;
    }
    deduped.push(account);
  });

  const nextAccounts = deduped.map((account) => {
    if (!account.systemKey) return account;
    const defaultAccount = defaults.find((item) => item.systemKey === account.systemKey);
    const nextBalance =
      account.systemKey === 'liquidPrimary' ? account.balance + mergedLegacySpendable : account.balance;

    return {
      ...account,
      balance: nextBalance,
      isSystem: true,
      isPrimary:
        account.systemKey === 'liquidPrimary'
          ? Boolean(account.isPrimary || sawLegacyPrimary || !deduped.some((item) => item.isPrimary))
          : false,
      includeInSpendable: account.systemKey === 'liquidPrimary',
      name:
        account.systemKey === 'liquidPrimary'
          ? storageSetup.liquidPrimaryName
          : toSafeText(account.name, defaultAccount?.name || account.name),
    };
  });

  return ensureSinglePrimaryAccount(nextAccounts);
};

export const renameSystemAccounts = (accounts, storageSetup) =>
  ensureSinglePrimaryAccount(
    accounts.map((account) => {
      if (account.systemKey === 'liquidPrimary')
        return { ...account, name: storageSetup.liquidPrimaryName, includeInSpendable: true };
      if (account.systemKey === 'safety')
        return { ...account, name: storageSetup.safetyName, includeInSpendable: false };
      if (account.systemKey === 'capital')
        return { ...account, name: storageSetup.capitalName, includeInSpendable: false };
      if (account.systemKey === 'sadaka')
        return { ...account, name: storageSetup.sadakaName, includeInSpendable: false };
      return account;
    }),
  );

export const allocateLiquidToSystemAccounts = (accounts, _storageSetup, liquidAmount) => {
  const safeLiquidAmount = toSafeMinorAmount(liquidAmount);

  return accounts.map((account) => {
    if (account.systemKey === 'liquidPrimary') return { ...account, balance: account.balance + safeLiquidAmount };
    return account;
  });
};

export const allocateProtectedToSystemAccount = (accounts, systemKey, amount) =>
  accounts.map((account) =>
    account.systemKey === systemKey ? { ...account, balance: account.balance + amount } : account,
  );

export const setSystemAccountBalance = (accounts, systemKey, amount) =>
  accounts.map((account) => (account.systemKey === systemKey ? { ...account, balance: amount } : account));

/** Money on spendable accounts other than the main one. */
export const getOtherSpendableTotal = (accounts) =>
  (Array.isArray(accounts) ? accounts : [])
    .filter((item) => item.includeInSpendable && item.systemKey !== 'liquidPrimary')
    .reduce((sum, item) => sum + (Number(item.balance) || 0), 0);

export const setLiquidSystemBalances = (accounts, _storageSetup, liquidAmount) =>
  accounts.map((account) => {
    if (account.systemKey === 'liquidPrimary') return { ...account, balance: toSafeMinorAmount(liquidAmount) };
    return account;
  });

export const moveFromAccount = (accounts, accountId, amount) => {
  const safeAmount = toSafeMinorAmount(amount);
  let moved = false;
  const next = accounts.map((account) => {
    if (account.id !== accountId) return account;
    if (account.balance < safeAmount) return account;
    moved = true;
    return { ...account, balance: account.balance - safeAmount };
  });
  return moved ? next : null;
};

export const moveToAccount = (accounts, accountId, amount) =>
  accounts.map((account) =>
    account.id === accountId ? { ...account, balance: account.balance + toSafeMinorAmount(amount) } : account,
  );

export const setPrimaryAccount = (accounts, accountId) =>
  ensureSinglePrimaryAccount(
    accounts.map((account) => ({
      ...account,
      isPrimary: account.id === accountId,
      includeInSpendable: account.id === accountId ? true : account.includeInSpendable,
    })),
  );

export const moveAccountPriority = (accounts, accountId, direction) => {
  const currentIndex = accounts.findIndex((account) => account.id === accountId);
  if (currentIndex === -1) return accounts;
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= accounts.length) return accounts;

  const nextAccounts = [...accounts];
  const [moved] = nextAccounts.splice(currentIndex, 1);
  nextAccounts.splice(nextIndex, 0, moved);
  return ensureSinglePrimaryAccount(nextAccounts);
};
