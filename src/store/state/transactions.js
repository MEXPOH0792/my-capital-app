import { toImportedMinorAmount, toImportedSignedMinorAmount, toSafeSignedMinorAmount } from '../../utils/money.js';
import { getCopy } from '../../i18n.js';
import { createId, syncMonthlyCoverage, toSafeIsoDate, toSafeText } from './core.js';

/**
 * What a debt-related record did:
 *   created       — took a loan (money arrives only with addToBalance)
 *   lent          — gave money to someone
 *   repaid_to_me  — someone returned money I lent
 *   payment       — I paid down my own loan (a real expense)
 */
export const DEBT_KINDS = new Set(['created', 'lent', 'repaid_to_me', 'payment']);

/** Records the app writes itself: the reserve for required bills and the sadaka share. */
export const SYSTEM_KINDS = new Set(['reserve', 'sadaka']);

const sanitizeTransactionMeta = (type, meta, isMinorState = false) => {
  if (!meta || typeof meta !== 'object') return null;
  const next = {};

  if (meta.accountId) next.accountId = toSafeText(meta.accountId);
  if (meta.accountName) next.accountName = toSafeText(meta.accountName);
  if (meta.fromAccountId) next.fromAccountId = toSafeText(meta.fromAccountId);
  if (meta.fromAccountName) next.fromAccountName = toSafeText(meta.fromAccountName);
  if (meta.toAccountId) next.toAccountId = toSafeText(meta.toAccountId);
  if (meta.toAccountName) next.toAccountName = toSafeText(meta.toAccountName);
  if (meta.debtId) next.debtId = toSafeText(meta.debtId);
  if (meta.parentId) next.parentId = toSafeText(meta.parentId);
  if (meta.distributed === true) next.distributed = true;
  if (DEBT_KINDS.has(meta.debtKind)) next.debtKind = meta.debtKind;
  if (SYSTEM_KINDS.has(meta.system)) next.system = meta.system;
  if (meta.sadakaPaidDelta !== undefined) {
    const sadakaPaidDelta = toImportedSignedMinorAmount(meta.sadakaPaidDelta, isMinorState);
    if (sadakaPaidDelta !== 0) next.sadakaPaidDelta = sadakaPaidDelta;
  }

  if (Array.isArray(meta.effects)) {
    next.effects = meta.effects
      .filter(Boolean)
      .map((item) => ({
        accountId: toSafeText(item.accountId),
        delta: toImportedSignedMinorAmount(item.delta, isMinorState),
      }))
      .filter((item) => item.accountId && item.delta !== 0);
  }

  if (Array.isArray(meta.debtEffects)) {
    next.debtEffects = meta.debtEffects
      .filter(Boolean)
      .map((item) => ({
        debtId: toSafeText(item.debtId),
        currentBalanceDelta: toImportedSignedMinorAmount(item.currentBalanceDelta, isMinorState),
      }))
      .filter((item) => item.debtId && item.currentBalanceDelta !== 0);
  }

  if (meta.coverage && typeof meta.coverage === 'object') {
    const monthKey = toSafeText(meta.coverage.monthKey);
    const incomeTotalDelta = toImportedSignedMinorAmount(meta.coverage.incomeTotalDelta, isMinorState);
    const requiredCoveredDelta = toImportedSignedMinorAmount(meta.coverage.requiredCoveredDelta, isMinorState);
    if (monthKey || incomeTotalDelta !== 0 || requiredCoveredDelta !== 0) {
      next.coverage = { monthKey, incomeTotalDelta, requiredCoveredDelta };
    }
  }

  if (type === 'transfer') {
    const hasTransferIds = next.fromAccountId && next.toAccountId;
    const hasTransferEffects = Array.isArray(next.effects) && next.effects.length > 0;
    return hasTransferIds && hasTransferEffects ? next : null;
  }

  // A debt record without money movement (a loan not added to the balance)
  // still needs its kind so reports can leave it out.
  if (next.debtKind && (type === 'income' || type === 'expense')) return next;
  if (next.system && type === 'expense') return next;

  if (type === 'income') {
    const hasIncomeEffects = Array.isArray(next.effects) && next.effects.length > 0;
    const hasCoverage = Boolean(next.coverage);
    return hasIncomeEffects || hasCoverage ? next : null;
  }

  if (type === 'expense') {
    // Parts of a distributed income (the sadaka share, the reserve for
    // required bills) carry no effects of their own: the parent income owns
    // them. The link to the parent is what keeps them in the history.
    if (next.parentId) return next;
    const hasExpenseEffects = Array.isArray(next.effects) && next.effects.length > 0;
    const hasDebtEffects = Array.isArray(next.debtEffects) && next.debtEffects.length > 0;
    return hasExpenseEffects || hasDebtEffects ? next : null;
  }

  return Object.keys(next).length > 0 ? next : null;
};

// Records written by one addIncome call land next to each other and within the
// same instant; anything further apart is not part of the same income.
const LEGACY_GROUP_WINDOW_MS = 2000;

const isWithinGroupWindow = (a, b) => {
  const left = new Date(a?.date ?? '').getTime();
  const right = new Date(b?.date ?? '').getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return Math.abs(left - right) <= LEGACY_GROUP_WINDOW_MS;
};

/**
 * Older builds wrote a distributed income as up to three independent records:
 * the income, the reserve for required bills and the automatic sadaka share.
 * Deleting the income then left the sadaka money behind, and the income could
 * never be edited. This folds such legacy triples into one group: the sadaka
 * effect moves onto the income, and the extra records become linked parts.
 *
 * Idempotent — an income already marked `distributed` is left alone.
 */
export const linkLegacyIncomeGroups = (transactions) => {
  const result = transactions.map((item) => ({ ...item, meta: item.meta ? { ...item.meta } : item.meta }));

  result.forEach((income, index) => {
    if (income.type !== 'income' || !income.meta || income.meta.distributed || income.meta.parentId) return;

    const reservedAmount = Number(income.meta.coverage?.requiredCoveredDelta) || 0;
    let sadakaPart = null;
    let reservePart = null;

    for (let offset = 1; offset <= 2; offset += 1) {
      const candidate = result[index + offset];
      if (!candidate || candidate.type !== 'expense' || !isWithinGroupWindow(income, candidate)) break;
      if (candidate.meta?.parentId) break;

      if (!sadakaPart && Number(candidate.meta?.sadakaPaidDelta) > 0) {
        sadakaPart = candidate;
      } else if (!reservePart && !candidate.meta && reservedAmount > 0 && candidate.amount === reservedAmount) {
        reservePart = candidate;
      } else {
        break;
      }
    }

    const hasSeveralEffects = Array.isArray(income.meta.effects) && income.meta.effects.length > 1;
    if (!sadakaPart && !reservePart && !hasSeveralEffects) return;

    if (sadakaPart) {
      income.meta.effects = [...(income.meta.effects || []), ...(sadakaPart.meta.effects || [])];
      income.meta.sadakaPaidDelta = sadakaPart.meta.sadakaPaidDelta;
      sadakaPart.meta = {
        parentId: income.id,
        ...(sadakaPart.meta.accountId ? { accountId: sadakaPart.meta.accountId } : {}),
        ...(sadakaPart.meta.accountName ? { accountName: sadakaPart.meta.accountName } : {}),
      };
    }
    if (reservePart) reservePart.meta = { parentId: income.id };
    income.meta.distributed = true;
  });

  return result;
};

/**
 * Older builds gave the main account a new id on every launch, so history
 * written before a restart points at ids that no longer exist — editing such
 * an operation failed and deleting it did not touch the main balance.
 *
 * Every record also stores the account name next to the id. An id that is
 * missing from the current accounts but was named like the main account is
 * mapped back onto the main account. Ids of closed custom accounts keep their
 * own names and are left alone.
 */
export const relinkOrphanedPrimaryIds = (transactions, accounts) => {
  const primary = (Array.isArray(accounts) ? accounts : []).find((item) => item.systemKey === 'liquidPrimary');
  if (!primary || !Array.isArray(transactions)) return transactions;
  const knownIds = new Set(accounts.map((item) => item.id));
  const remap = new Map();

  transactions.forEach((item) => {
    const meta = item?.meta;
    if (!meta) return;
    [
      [meta.accountId, meta.accountName],
      [meta.fromAccountId, meta.fromAccountName],
      [meta.toAccountId, meta.toAccountName],
    ].forEach(([id, name]) => {
      if (id && !knownIds.has(id) && name === primary.name) remap.set(id, primary.id);
    });
  });
  if (remap.size === 0) return transactions;

  const fix = (id) => remap.get(id) ?? id;
  return transactions.map((item) => {
    const meta = item?.meta;
    if (!meta) return item;
    const next = { ...meta };
    if (next.accountId) next.accountId = fix(next.accountId);
    if (next.fromAccountId) next.fromAccountId = fix(next.fromAccountId);
    if (next.toAccountId) next.toAccountId = fix(next.toAccountId);
    if (Array.isArray(next.effects)) {
      next.effects = next.effects.map((effect) => ({ ...effect, accountId: fix(effect.accountId) }));
    }
    return { ...item, meta: next };
  });
};

const DEBT_PREFIXES = ['ru', 'en'].map((language) => {
  const copy = getCopy(language);
  return { created: `${copy.modal.debtCreated}:`, payment: `${copy.modal.debtPayment}:` };
});

/**
 * Older builds wrote debt records without saying what they were, so reports
 * counted a loan as income. The kind is recovered from the category prefix in
 * either language. Records tagged this way have no effects to roll back.
 */
export const tagLegacyDebtRecords = (transactions) =>
  transactions.map((item) => {
    if (item.type === 'transfer' || item.meta?.debtKind) return item;
    const category = String(item.category ?? '');
    const isCreated = DEBT_PREFIXES.some((prefix) => category.startsWith(prefix.created));
    const isPayment = DEBT_PREFIXES.some((prefix) => category.startsWith(prefix.payment));
    if (!isCreated && !isPayment) return item;

    const debtKind = isCreated
      ? item.type === 'income'
        ? 'created'
        : 'lent'
      : item.type === 'income'
        ? 'repaid_to_me'
        : 'payment';
    return { ...item, meta: { ...(item.meta || {}), debtKind } };
  });

const SYSTEM_CATEGORIES = ['ru', 'en'].flatMap((language) => {
  const copy = getCopy(language);
  return [
    [copy.common.reserveForRequired, 'reserve'],
    [copy.common.sadakaAuto, 'sadaka'],
  ];
});

/**
 * Older builds told the reserve and sadaka records apart only by their
 * category text, in the language active at the time. After a language switch
 * reports lost track of them. The kind is recovered from the text in either
 * language and stored as a flag.
 */
export const tagLegacySystemRecords = (transactions) =>
  transactions.map((item) => {
    if (item.type !== 'expense' || item.meta?.system) return item;
    const match = SYSTEM_CATEGORIES.find(([category]) => category === item.category);
    if (!match) return item;
    return { ...item, meta: { ...(item.meta || {}), system: match[1] } };
  });

/**
 * Why a debt record cannot be deleted, or null when it can.
 *
 * - `legacy`: written by an older build without the data needed to roll it
 *   back (no debt link or no effects). Deleting it would only hide history.
 * - `has_payments`: the record that opened a debt, while payments or returns
 *   against that debt still exist — those must go first.
 */
export const getDebtDeleteBlock = (transactions, transaction) => {
  const meta = transaction?.meta;
  const kind = meta?.debtKind;
  if (!kind || kind === 'payment') return null;

  if (kind === 'repaid_to_me') {
    return Array.isArray(meta.effects) && meta.effects.length > 0 ? null : 'legacy';
  }

  if (!meta.debtId) return 'legacy';
  const hasFollowUps = (Array.isArray(transactions) ? transactions : []).some(
    (item) =>
      item.id !== transaction.id &&
      item.meta?.debtId === meta.debtId &&
      (item.meta?.debtKind === 'payment' || item.meta?.debtKind === 'repaid_to_me' || item.meta?.debtEffects),
  );
  return hasFollowUps ? 'has_payments' : null;
};

/** The income a linked part belongs to, or the transaction itself. */
export const getTransactionRoot = (transactions, transaction) => {
  const parentId = transaction?.meta?.parentId;
  if (!parentId) return transaction;
  return (Array.isArray(transactions) ? transactions : []).find((item) => item.id === parentId) ?? transaction;
};

/** Ids of the root transaction and every part linked to it. */
export const getTransactionGroupIds = (transactions, rootId) =>
  new Set([
    rootId,
    ...(Array.isArray(transactions) ? transactions : [])
      .filter((item) => item?.meta?.parentId === rootId)
      .map((item) => item.id),
  ]);

export const sanitizeTransactions = (transactions, copy, isMinorState = false) => {
  if (!Array.isArray(transactions)) return [];
  const sanitized = transactions
    .filter(Boolean)
    .map((item) => ({
      id: toSafeText(item.id, createId()),
      type: ['income', 'expense', 'transfer'].includes(item.type) ? item.type : 'expense',
      amount: toImportedMinorAmount(item.amount, isMinorState),
      category: toSafeText(item.category, copy.common.operation),
      date: toSafeIsoDate(item.date),
      meta: sanitizeTransactionMeta(item.type, item.meta, isMinorState),
    }))
    .filter((item) => item.amount >= 0);
  return tagLegacySystemRecords(tagLegacyDebtRecords(linkLegacyIncomeGroups(sanitized)));
};

export const getTransactionRelatedAccountIds = (transaction) => {
  const ids = new Set();
  const meta = transaction?.meta;
  if (!meta || typeof meta !== 'object') return [];

  if (meta.accountId) ids.add(meta.accountId);
  if (meta.fromAccountId) ids.add(meta.fromAccountId);
  if (meta.toAccountId) ids.add(meta.toAccountId);
  if (Array.isArray(meta.effects)) {
    meta.effects.forEach((item) => {
      if (item?.accountId) ids.add(item.accountId);
    });
  }
  return [...ids];
};

export const applyAccountEffects = (accounts, effects, multiplier = 1) => {
  if (!Array.isArray(effects) || effects.length === 0) return accounts;

  const deltas = new Map();
  effects.forEach((item) => {
    if (!item?.accountId) return;
    const nextDelta = (deltas.get(item.accountId) || 0) + toSafeSignedMinorAmount(item.delta) * multiplier;
    deltas.set(item.accountId, nextDelta);
  });

  const canApply = accounts.every((account) => {
    const delta = deltas.get(account.id) || 0;
    return account.balance + delta >= 0;
  });

  if (!canApply) return null;

  return accounts.map((account) => ({
    ...account,
    balance: account.balance + (deltas.get(account.id) || 0),
  }));
};

export const applyDebtEffects = (debts, effects, multiplier = 1) => {
  if (!Array.isArray(effects) || effects.length === 0) return debts;

  const deltas = new Map();
  effects.forEach((item) => {
    if (!item?.debtId) return;
    const nextDelta = (deltas.get(item.debtId) || 0) + toSafeSignedMinorAmount(item.currentBalanceDelta) * multiplier;
    deltas.set(item.debtId, nextDelta);
  });

  let isValid = true;
  const nextDebts = debts.map((debt) => {
    const delta = deltas.get(debt.id) || 0;
    if (delta === 0) return debt;
    const nextBalance = debt.currentBalance + delta;
    if (nextBalance < 0 || nextBalance > debt.initialBalance) {
      isValid = false;
      return debt;
    }
    return { ...debt, currentBalance: nextBalance, status: nextBalance === 0 ? 'CLOSED' : 'ACTIVE' };
  });

  return isValid ? nextDebts : null;
};

export const applyCoverageEffect = (coverage, coverageEffect, multiplier = 1) => {
  const synced = syncMonthlyCoverage(coverage);
  if (!coverageEffect || typeof coverageEffect !== 'object') return synced;
  if (coverageEffect.monthKey && coverageEffect.monthKey !== synced.monthKey) return synced;

  return {
    ...synced,
    incomeTotal: Math.max(
      0,
      synced.incomeTotal + toSafeSignedMinorAmount(coverageEffect.incomeTotalDelta) * multiplier,
    ),
    requiredCovered: Math.max(
      0,
      synced.requiredCovered + toSafeSignedMinorAmount(coverageEffect.requiredCoveredDelta) * multiplier,
    ),
  };
};

export const rollbackTransactionState = (state, transaction) => {
  const accounts = applyAccountEffects(state.accounts, transaction?.meta?.effects, -1);
  if (!accounts) return null;

  const debts = applyDebtEffects(state.debts, transaction?.meta?.debtEffects, -1);
  if (!debts) return null;

  const monthlyCoverage = applyCoverageEffect(state.monthlyCoverage, transaction?.meta?.coverage, -1);
  const totalSadakaPaid = Math.max(
    0,
    (Number(state.totalSadakaPaid) || 0) - toSafeSignedMinorAmount(transaction?.meta?.sadakaPaidDelta),
  );

  return { accounts, debts, monthlyCoverage, totalSadakaPaid };
};
