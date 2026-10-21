import type { SupportedLanguage } from '../utils/money.js';

export type { SupportedLanguage };

export type DistributionMode = 'soft' | 'base' | 'growth' | 'custom';

export type DistributionBasis = 'total_income' | 'free_after_required';

export interface AllocationPercents {
  balance: number;
  safety: number;
  capital: number;
  sadaka: number;
}

export type AllocationKey = keyof AllocationPercents;

export interface AllocationModeDefinition {
  allocation: AllocationPercents;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  includeInSpendable: boolean;
  isPrimary: boolean;
  isSystem: boolean;
  systemKey: SystemAccountKey | null;
}

export type SystemAccountKey = 'liquidPrimary' | 'safety' | 'capital' | 'sadaka';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface AccountEffect {
  accountId: string;
  delta: number;
}

export interface DebtEffect {
  debtId: string;
  currentBalanceDelta: number;
}

export interface CoverageEffect {
  monthKey?: string;
  incomeTotalDelta?: number;
  requiredCoveredDelta?: number;
}

export interface TransactionMeta {
  accountId?: string;
  accountName?: string;
  fromAccountId?: string;
  fromAccountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  debtId?: string;
  effects?: AccountEffect[];
  debtEffects?: DebtEffect[];
  coverage?: CoverageEffect;
  sadakaPaidDelta?: number;
  /** Set on an income split by the distribution rules; it owns every effect. */
  distributed?: boolean;
  /** What a debt-related record did; see DEBT_KINDS in store/state/transactions.js. */
  debtKind?: 'created' | 'lent' | 'repaid_to_me' | 'payment';
  /** Records the app writes itself; recognised by this flag, not by category text. */
  system?: 'reserve' | 'sadaka';
  /** Set on a display-only part (sadaka share, reserve) of a distributed income. */
  parentId?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  meta?: TransactionMeta | null;
}

export type DebtType = 'LIABILITY' | 'ASSET';
export type DebtStatus = 'ACTIVE' | 'CLOSED';

export interface Debt {
  id: string;
  title: string;
  type: DebtType;
  status: DebtStatus;
  addToBalance?: boolean;
  bankName: string;
  interestRate: number;
  initialBalance: number;
  currentBalance: number;
  createdAt: string;
}

export interface RequiredExpense {
  id: string;
  title: string;
  amount: number;
}

export interface MonthlyCoverage {
  monthKey: string;
  incomeTotal: number;
  requiredCovered: number;
}

export interface StorageSetup {
  liquidPrimaryName: string;
  liquidSecondaryName: string;
  liquidPrimaryPercent: number;
  liquidSecondaryPercent: number;
  safetyName: string;
  capitalName: string;
  sadakaName: string;
}

export interface HiddenPresets {
  ru: string[];
  en: string[];
}
