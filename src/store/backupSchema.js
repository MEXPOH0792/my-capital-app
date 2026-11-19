import { MONEY_VERSION } from '../utils/money.js';
import { APP_VERSION } from '../app/appVersion.js';
import { migrateBackupPayload } from './backupMigrations.js';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertOptionalString = (value, label) => {
  if (value === undefined) return;
  assert(typeof value === 'string', `${label} must be a string`);
};

const assertOptionalNullableString = (value, label) => {
  if (value === undefined || value === null) return;
  assert(typeof value === 'string', `${label} must be a string`);
};

const assertOptionalBoolean = (value, label) => {
  if (value === undefined) return;
  assert(typeof value === 'boolean', `${label} must be a boolean`);
};

const assertOptionalNumber = (value, label) => {
  if (value === undefined) return;
  assert(typeof value === 'number' && Number.isFinite(value), `${label} must be a finite number`);
};

const assertOptionalArray = (value, label) => {
  if (value === undefined) return;
  assert(Array.isArray(value), `${label} must be an array`);
};

const assertOptionalObject = (value, label) => {
  if (value === undefined) return;
  assert(isPlainObject(value), `${label} must be an object`);
};

const validateAccount = (account, index) => {
  assert(isPlainObject(account), `accounts[${index}] must be an object`);
  assertOptionalString(account.id, `accounts[${index}].id`);
  assertOptionalString(account.name, `accounts[${index}].name`);
  assertOptionalNumber(account.balance, `accounts[${index}].balance`);
  assertOptionalBoolean(account.includeInSpendable, `accounts[${index}].includeInSpendable`);
  assertOptionalBoolean(account.isPrimary, `accounts[${index}].isPrimary`);
  assertOptionalBoolean(account.isSystem, `accounts[${index}].isSystem`);
  assertOptionalNullableString(account.systemKey, `accounts[${index}].systemKey`);
};

const validateRequiredExpense = (item, index) => {
  assert(isPlainObject(item), `requiredExpenses[${index}] must be an object`);
  assertOptionalString(item.id, `requiredExpenses[${index}].id`);
  assertOptionalString(item.title, `requiredExpenses[${index}].title`);
  assertOptionalNumber(item.amount, `requiredExpenses[${index}].amount`);
};

const validateCategoryLimit = (item, index) => {
  assert(isPlainObject(item), `categoryLimits[${index}] must be an object`);
  assertOptionalString(item.id, `categoryLimits[${index}].id`);
  assertOptionalString(item.category, `categoryLimits[${index}].category`);
  assertOptionalNumber(item.amount, `categoryLimits[${index}].amount`);
};

const validateDebt = (debt, index) => {
  assert(isPlainObject(debt), `debts[${index}] must be an object`);
  assertOptionalString(debt.id, `debts[${index}].id`);
  assertOptionalString(debt.title, `debts[${index}].title`);
  assertOptionalString(debt.type, `debts[${index}].type`);
  assertOptionalString(debt.status, `debts[${index}].status`);
  assertOptionalString(debt.bankName, `debts[${index}].bankName`);
  assertOptionalString(debt.createdAt, `debts[${index}].createdAt`);
  assertOptionalBoolean(debt.addToBalance, `debts[${index}].addToBalance`);
  assertOptionalNumber(debt.amount, `debts[${index}].amount`);
  assertOptionalNumber(debt.initialBalance, `debts[${index}].initialBalance`);
  assertOptionalNumber(debt.currentBalance, `debts[${index}].currentBalance`);
  assertOptionalNumber(debt.interestRate, `debts[${index}].interestRate`);
};

const validateTransactionMeta = (meta, index) => {
  assert(isPlainObject(meta), `transactions[${index}].meta must be an object`);
  assertOptionalString(meta.accountId, `transactions[${index}].meta.accountId`);
  assertOptionalString(meta.accountName, `transactions[${index}].meta.accountName`);
  assertOptionalString(meta.fromAccountId, `transactions[${index}].meta.fromAccountId`);
  assertOptionalString(meta.fromAccountName, `transactions[${index}].meta.fromAccountName`);
  assertOptionalString(meta.toAccountId, `transactions[${index}].meta.toAccountId`);
  assertOptionalString(meta.toAccountName, `transactions[${index}].meta.toAccountName`);
  assertOptionalString(meta.debtId, `transactions[${index}].meta.debtId`);
  assertOptionalString(meta.parentId, `transactions[${index}].meta.parentId`);
  assertOptionalBoolean(meta.distributed, `transactions[${index}].meta.distributed`);
  assertOptionalString(meta.debtKind, `transactions[${index}].meta.debtKind`);
  assertOptionalString(meta.system, `transactions[${index}].meta.system`);

  assertOptionalArray(meta.effects, `transactions[${index}].meta.effects`);
  meta.effects?.forEach((effect, effectIndex) => {
    assert(isPlainObject(effect), `transactions[${index}].meta.effects[${effectIndex}] must be an object`);
    assertOptionalString(effect.accountId, `transactions[${index}].meta.effects[${effectIndex}].accountId`);
    assertOptionalNumber(effect.delta, `transactions[${index}].meta.effects[${effectIndex}].delta`);
  });

  assertOptionalArray(meta.debtEffects, `transactions[${index}].meta.debtEffects`);
  meta.debtEffects?.forEach((effect, effectIndex) => {
    assert(isPlainObject(effect), `transactions[${index}].meta.debtEffects[${effectIndex}] must be an object`);
    assertOptionalString(effect.debtId, `transactions[${index}].meta.debtEffects[${effectIndex}].debtId`);
    assertOptionalNumber(
      effect.currentBalanceDelta,
      `transactions[${index}].meta.debtEffects[${effectIndex}].currentBalanceDelta`,
    );
  });

  assertOptionalObject(meta.coverage, `transactions[${index}].meta.coverage`);
  if (meta.coverage) {
    assertOptionalString(meta.coverage.monthKey, `transactions[${index}].meta.coverage.monthKey`);
    assertOptionalNumber(meta.coverage.incomeTotalDelta, `transactions[${index}].meta.coverage.incomeTotalDelta`);
    assertOptionalNumber(
      meta.coverage.requiredCoveredDelta,
      `transactions[${index}].meta.coverage.requiredCoveredDelta`,
    );
  }
};

const validateTransaction = (transaction, index) => {
  assert(isPlainObject(transaction), `transactions[${index}] must be an object`);
  assertOptionalString(transaction.id, `transactions[${index}].id`);
  assertOptionalString(transaction.type, `transactions[${index}].type`);
  assertOptionalString(transaction.category, `transactions[${index}].category`);
  assertOptionalString(transaction.date, `transactions[${index}].date`);
  assertOptionalNumber(transaction.amount, `transactions[${index}].amount`);
  if (transaction.meta !== undefined && transaction.meta !== null) {
    validateTransactionMeta(transaction.meta, index);
  }
};

export const assertBackupStateShape = (state) => {
  assert(isPlainObject(state), 'state must be an object');

  assertOptionalBoolean(state.isDarkMode, 'state.isDarkMode');
  assertOptionalString(state.language, 'state.language');
  assertOptionalString(state.currency, 'state.currency');
  assertOptionalString(state.securityPinHash, 'state.securityPinHash');
  assertOptionalBoolean(state.isOnboardingCompleted, 'state.isOnboardingCompleted');
  assertOptionalNumber(state.moneyVersion, 'state.moneyVersion');
  assertOptionalNumber(state.availableBalance, 'state.availableBalance');
  assertOptionalNumber(state.safetyFund, 'state.safetyFund');
  assertOptionalNumber(state.capital, 'state.capital');
  assertOptionalNumber(state.totalSadakaPaid, 'state.totalSadakaPaid');
  assertOptionalNullableString(state.lastBackupAt, 'state.lastBackupAt');
  assertOptionalString(state.familySenderName, 'state.familySenderName');
  if (state.familyMember !== null && state.familyMember !== undefined) {
    assert(isPlainObject(state.familyMember), 'state.familyMember must be an object');
    assertOptionalString(state.familyMember.name, 'state.familyMember.name');
    assertOptionalString(state.familyMember.senderId, 'state.familyMember.senderId');
  }
  assertOptionalArray(state.familyReports, 'state.familyReports');
  state.familyReports?.forEach((report, index) => {
    assert(isPlainObject(report), `familyReports[${index}] must be an object`);
    assertOptionalString(report.monthKey, `familyReports[${index}].monthKey`);
    assertOptionalNumber(report.expensesTotal, `familyReports[${index}].expensesTotal`);
    assertOptionalArray(report.categories, `familyReports[${index}].categories`);
  });
  if (state.autoLockMinutes !== null) assertOptionalNumber(state.autoLockMinutes, 'state.autoLockMinutes');
  if (state.widgetShowAmounts !== null) assertOptionalBoolean(state.widgetShowAmounts, 'state.widgetShowAmounts');
  assertOptionalNumber(state.targetCapital, 'state.targetCapital');
  assertOptionalNumber(state.targetSafety, 'state.targetSafety');
  assertOptionalBoolean(state.incomeDistributionEnabled, 'state.incomeDistributionEnabled');
  assertOptionalString(state.incomeDistributionMode, 'state.incomeDistributionMode');
  assertOptionalString(state.incomeDistributionBasis, 'state.incomeDistributionBasis');
  assertOptionalObject(state.allocationPercents, 'state.allocationPercents');
  assertOptionalObject(state.storageSetup, 'state.storageSetup');
  assertOptionalObject(state.monthlyCoverage, 'state.monthlyCoverage');
  assertOptionalArray(state.accounts, 'state.accounts');
  assertOptionalArray(state.requiredExpenses, 'state.requiredExpenses');
  assertOptionalArray(state.categoryLimits, 'state.categoryLimits');
  assertOptionalArray(state.transactions, 'state.transactions');
  assertOptionalArray(state.debts, 'state.debts');

  state.accounts?.forEach(validateAccount);
  state.requiredExpenses?.forEach(validateRequiredExpense);
  state.categoryLimits?.forEach(validateCategoryLimit);
  state.debts?.forEach(validateDebt);
  state.transactions?.forEach(validateTransaction);

  if (state.monthlyCoverage) {
    assertOptionalString(state.monthlyCoverage.monthKey, 'state.monthlyCoverage.monthKey');
    assertOptionalNumber(state.monthlyCoverage.incomeTotal, 'state.monthlyCoverage.incomeTotal');
    assertOptionalNumber(state.monthlyCoverage.requiredCovered, 'state.monthlyCoverage.requiredCovered');
  }
};

// === Canonical JSON serialization (stable key order) for HMAC ===

const canonicalize = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
};

const toHex = (buffer) => {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const toArrayBuffer = (view) => {
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
};

const hexToBytes = (hex) => {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) throw new Error('Invalid hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const constantTimeEqualHex = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

const signWithKeyHex = async (keyHex, canonicalText) => {
  const keyBytes = hexToBytes(keyHex);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(canonicalText));
  return toHex(sigBuffer);
};

const SIGNATURE_ALGO = 'hmac-sha256';
export const BACKUP_SIGNATURE_VERSION = 1;

export const createBackupPayload = (state) => ({
  version: MONEY_VERSION,
  appVersion: APP_VERSION,
  exportedAt: new Date().toISOString(),
  state,
});

/**
 * Create a backup payload and sign it with `keyHex` (HMAC-SHA256).
 * The signature is computed over the canonical JSON of the payload without the
 * signature field itself.
 */
export const createSignedBackupPayload = async (state, keyHex) => {
  const payload = createBackupPayload(state);
  if (!keyHex) return payload;
  const canonicalText = canonicalize(payload);
  const sigHex = await signWithKeyHex(keyHex, canonicalText);
  return {
    ...payload,
    signature: {
      v: BACKUP_SIGNATURE_VERSION,
      algo: SIGNATURE_ALGO,
      value: sigHex,
    },
  };
};

export const parseBackupPayload = (payload) => {
  assert(isPlainObject(payload), 'Backup payload must be an object');
  assert(typeof payload.version === 'number' && Number.isInteger(payload.version), 'Backup version is required');
  // Apply the migration chain so a v1 file imported into the current build is
  // upgraded to the latest envelope shape. Throws BackupVersionError for files
  // newer than this app or with missing intermediate steps.
  const migrated = migrateBackupPayload(payload);
  assertOptionalString(migrated.appVersion, 'Backup appVersion');
  assert(migrated.version === MONEY_VERSION, `Unsupported backup version: ${migrated.version}`);
  assert(
    typeof migrated.exportedAt === 'string' && !Number.isNaN(Date.parse(migrated.exportedAt)),
    'Backup exportedAt must be a valid ISO date',
  );
  if (migrated.signature !== undefined) {
    assert(isPlainObject(migrated.signature), 'Backup signature must be an object');
    assert(migrated.signature.v === BACKUP_SIGNATURE_VERSION, 'Unsupported backup signature version');
    assert(migrated.signature.algo === SIGNATURE_ALGO, 'Unsupported backup signature algorithm');
    assert(
      typeof migrated.signature.value === 'string' && /^[a-f0-9]+$/i.test(migrated.signature.value),
      'Backup signature value must be a hex string',
    );
  }
  assertBackupStateShape(migrated.state);

  return migrated;
};

/**
 * Returns one of:
 *  - 'missing'   : payload has no signature (legacy backup)
 *  - 'valid'     : signature matches
 *  - 'invalid'   : signature is present but does not match (tampered)
 *  - 'unchecked' : no key supplied, signature ignored
 */
export const verifyBackupSignature = async (payload, keyHex) => {
  if (!payload?.signature) return 'missing';
  if (!keyHex) return 'unchecked';
  const { signature: _signature, ...rest } = payload;
  void _signature;
  const canonicalText = canonicalize(rest);
  const sigHex = await signWithKeyHex(keyHex, canonicalText);
  return constantTimeEqualHex(sigHex, payload.signature.value) ? 'valid' : 'invalid';
};
