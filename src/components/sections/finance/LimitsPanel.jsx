import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { isReportedExpense } from '../../../domain/history.js';
import { SectionCard, SectionHeader } from '../../ui/AppUi.jsx';
import { getActiveCategoryPresets, getLimitProgress, getMonthlySpendByCategory } from '../../../domain/finance.js';

const STATUS_CLASS = {
  ok: 'text-[var(--mc-positive)]',
  warning: 'text-[var(--mc-warning)]',
  exceeded: 'text-[var(--mc-negative)]',
};

const BAR_CLASS = {
  ok: 'bg-emerald-500/70',
  warning: 'bg-amber-500/70',
  exceeded: 'bg-red-500/70',
};

/** Kept out of the component so the clock read stays outside render. */
function buildProgress(transactions, categoryLimits) {
  const trackedExpenses = transactions.filter(isReportedExpense);
  return getLimitProgress(categoryLimits, getMonthlySpendByCategory(trackedExpenses, Date.now()));
}

/**
 * Monthly ceilings per spending category.
 *
 * Progress is measured against the current calendar month only — a limit that
 * counted all history would be permanently blown and stop meaning anything.
 */
export default function LimitsPanel({ theme, store, copy, softPanelStyle, fmt, formatInput, isEnglish }) {
  const [form, setForm] = useState({ category: '', amount: '' });

  const progress = useMemo(
    () => buildProgress(store.transactions, store.categoryLimits || []),
    [store.transactions, store.categoryLimits],
  );

  // Offer the categories the user actually spends in, minus the ones that
  // already have a ceiling.
  const suggestions = useMemo(() => {
    const taken = new Set((store.categoryLimits || []).map((item) => item.category));
    return getActiveCategoryPresets({
      language: store.language,
      type: 'expense',
      transactions: store.transactions,
      hiddenPresets: store.hiddenExpensePresets?.[store.language] || [],
      copy,
    }).filter((category) => !taken.has(category));
  }, [store.categoryLimits, store.language, store.transactions, store.hiddenExpensePresets, copy]);

  const canSubmit = Boolean(form.category.trim()) && Boolean(form.amount.trim());

  const submit = () => {
    if (!canSubmit) return;
    store.setCategoryLimit(form.category.trim(), form.amount);
    setForm({ category: '', amount: '' });
  };

  return (
    <div className="space-y-2.5">
      <SectionCard theme={theme} className="space-y-2.5 p-3" tone="utility">
        <SectionHeader
          eyebrow={isEnglish ? 'Limits' : 'Лимиты'}
          title={isEnglish ? 'Monthly ceilings' : 'Потолок трат на месяц'}
          description={
            isEnglish
              ? 'A limit warns you while you are entering the expense, not after.'
              : 'Лимит предупреждает в момент ввода траты, а не после.'
          }
          compact
        />

        {suggestions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 8).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, category }))}
                aria-pressed={form.category === category}
                className={`min-h-[30px] rounded-full border px-3 text-sm font-semibold transition-all active:scale-[0.99] ${
                  form.category === category
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                    : 'border-transparent bg-[var(--mc-soft)] opacity-70'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,7rem)] gap-2 max-[359px]:grid-cols-1">
          <input
            type="text"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            placeholder={isEnglish ? 'Category' : 'Категория'}
            className="min-w-0 w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
            style={softPanelStyle}
          />
          <input
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: formatInput(event.target.value) }))}
            placeholder={isEnglish ? 'Amount' : 'Сумма'}
            className="min-w-0 w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
            style={softPanelStyle}
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="min-h-[38px] w-full rounded-[16px] bg-emerald-600 text-sm font-semibold text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
        >
          {isEnglish ? 'Set limit' : 'Поставить лимит'}
        </button>
      </SectionCard>

      <SectionCard theme={theme} className="space-y-2.5 p-3" tone="utility">
        <p className="text-sm font-semibold opacity-80">{isEnglish ? 'This month' : 'В этом месяце'}</p>

        {progress.length === 0 ? (
          <p className="text-sm leading-[1.35] opacity-80">
            {isEnglish
              ? 'No limits yet. Start with the category the report calls your main leak.'
              : 'Лимитов пока нет. Начни с категории, которую отчёт называет главной утечкой.'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {progress.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold">{item.category}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`font-numbers text-sm font-extrabold tabular-nums ${STATUS_CLASS[item.status]}`}>
                      {fmt(item.spent)} / {fmt(item.limit)}
                    </span>
                    <button
                      type="button"
                      onClick={() => store.removeCategoryLimit(item.id)}
                      aria-label={isEnglish ? `Remove limit for ${item.category}` : `Убрать лимит для ${item.category}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[var(--mc-negative)] opacity-70 transition-opacity hover:opacity-100"
                      style={{ borderColor: theme.border }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--mc-soft)]">
                  <div
                    className={`mc-bar h-full rounded-full ${BAR_CLASS[item.status]}`}
                    style={{ width: `${Math.min(100, Math.max(2, item.percent))}%` }}
                  />
                </div>
                <p className="text-sm leading-[1.3] opacity-80">
                  {item.remaining >= 0
                    ? isEnglish
                      ? `${fmt(item.remaining)} left`
                      : `Осталось ${fmt(item.remaining)}`
                    : isEnglish
                      ? `Over by ${fmt(Math.abs(item.remaining))}`
                      : `Превышено на ${fmt(Math.abs(item.remaining))}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
