import type { SupportedLanguage, Transaction, TransactionType } from '../types.js';

interface CategoryCopy {
  common: { reserveForRequired: string; sadakaAuto: string };
  modal: { debtCreated: string; debtPayment: string };
}

interface CategoryPresetBuckets {
  income: string[];
  expense: string[];
}

const toSafeText = (value: unknown, fallback: string = ''): string => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const DEFAULT_CATEGORY_PRESETS: Record<SupportedLanguage, CategoryPresetBuckets> = {
  en: {
    income: ['Salary', 'Advance', 'Freelance', 'Business', 'Bonus', 'Sale', 'Gift', 'Interest'],
    expense: [
      'Groceries',
      'Cafe',
      'Transport',
      'Home',
      'Utilities',
      'Health',
      'Clothing',
      'Mobile',
      'Leisure',
      'Education',
      'Kids',
      'Gifts',
    ],
  },
  ru: {
    income: ['Зарплата', 'Аванс', 'Фриланс', 'Бизнес', 'Премия', 'Продажа', 'Подарок', 'Проценты'],
    expense: [
      'Продукты',
      'Кафе',
      'Транспорт',
      'Дом',
      'Коммуналка',
      'Здоровье',
      'Одежда',
      'Связь',
      'Досуг',
      'Образование',
      'Дети',
      'Подарки',
    ],
  },
};

const MAX_DYNAMIC_CATEGORY_PRESETS = 8;

// Transactions are stored newest-first, so index 0 is the most recent entry.
// Each use is worth less the further back it sits, which lets a habit the user
// picked up this month outrank a category they used a lot a year ago.
const RECENCY_HALF_LIFE = 25;

const recencyWeight = (index: number): number => 0.5 ** (index / RECENCY_HALF_LIFE);

export const getCategoryPresets = (language: SupportedLanguage | string | undefined): CategoryPresetBuckets =>
  (DEFAULT_CATEGORY_PRESETS as Record<string, CategoryPresetBuckets>)[language ?? 'ru'] ?? DEFAULT_CATEGORY_PRESETS.ru;

const getIgnoredCategories = (copy: CategoryCopy): Set<string> =>
  new Set([copy.common.reserveForRequired, copy.common.sadakaAuto]);

const isGeneratedDebtCategory = (category: string, copy: CategoryCopy): boolean =>
  category.startsWith(`${copy.modal.debtCreated}:`) || category.startsWith(`${copy.modal.debtPayment}:`);

export interface ActiveCategoryPresetsArgs {
  language: SupportedLanguage | string;
  type: TransactionType;
  transactions: Transaction[] | unknown[];
  hiddenPresets?: string[];
  copy: CategoryCopy;
}

interface CategoryStats {
  /** Recency-weighted usage score — drives the ordering. */
  score: number;
  count: number;
  /** Lowest index seen, i.e. the most recent use. */
  lastUsedIndex: number;
}

export const getActiveCategoryPresets = ({
  language,
  type,
  transactions,
  hiddenPresets = [],
  copy,
}: ActiveCategoryPresetsArgs): string[] => {
  const presets = getCategoryPresets(language);
  const defaults = type === 'income' ? presets.income : type === 'expense' ? presets.expense : [];
  const hidden = new Set(
    (hiddenPresets || []).map((item: unknown) => toSafeText(item)).filter((value): value is string => Boolean(value)),
  );
  const ignoredCategories = getIgnoredCategories(copy);
  const stats = new Map<string, CategoryStats>();

  (Array.isArray(transactions) ? transactions : []).forEach((item, index) => {
    const tx = item as Partial<Transaction> | null | undefined;
    if (tx?.type !== type) return;
    const category = toSafeText(tx?.category);
    const meta = tx?.meta;
    if (
      !category ||
      hidden.has(category) ||
      meta?.system ||
      meta?.parentId ||
      meta?.debtKind ||
      ignoredCategories.has(category) ||
      isGeneratedDebtCategory(category, copy)
    ) {
      return;
    }

    const current = stats.get(category) ?? { score: 0, count: 0, lastUsedIndex: index };
    stats.set(category, {
      score: current.score + recencyWeight(index),
      count: current.count + 1,
      lastUsedIndex: Math.min(current.lastUsedIndex, index),
    });
  });

  const dynamic = [...stats.entries()]
    .sort(
      (a, b) =>
        b[1].score - a[1].score ||
        b[1].count - a[1].count ||
        a[1].lastUsedIndex - b[1].lastUsedIndex ||
        a[0].localeCompare(b[0], language === 'en' ? 'en' : 'ru'),
    )
    .map(([category]) => category)
    .slice(0, MAX_DYNAMIC_CATEGORY_PRESETS);

  return [...dynamic, ...defaults].filter(
    (category, index, list) => Boolean(category) && !hidden.has(category) && list.indexOf(category) === index,
  );
};

export interface AggregatedCategory {
  category: string;
  amount: number;
}

export const aggregateTransactionsByCategory = (
  transactions: Pick<Transaction, 'category' | 'amount'>[],
  fallbackCategory: string = 'Uncategorized',
): AggregatedCategory[] => {
  const grouped = new Map<string, number>();

  transactions.forEach((item) => {
    const category = toSafeText(item.category, fallbackCategory);
    grouped.set(category, (grouped.get(category) ?? 0) + Number(item.amount ?? 0));
  });

  return [...grouped.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
};
