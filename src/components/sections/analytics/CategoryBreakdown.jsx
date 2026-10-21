import { useMemo, useState } from 'react';
import { PieChart } from 'lucide-react';
import { SectionCard } from '../../ui/primitives.jsx';

/** Rows shown before the "show all" expander kicks in. */
const VISIBLE_CATEGORY_ROWS = 6;

/** Spending and income structure, sliced three ways over the same rows. */
export default function CategoryBreakdown({
  expenseCategories,
  incomeCategories,
  accountSpending,
  totalTrackedExpenses,
  incomeTotal,
  fmt,
  isEnglish,
  theme,
}) {
  const [mode, setMode] = useState('expense');
  const [isExpanded, setIsExpanded] = useState(false);

  const isIncome = mode === 'income';
  // Accounts are a second cut of the same spending, so they share the expense
  // total and the outgoing colour.
  const rows = isIncome ? incomeCategories : mode === 'account' ? accountSpending : expenseCategories;
  const total = isIncome ? incomeTotal : totalTrackedExpenses;

  const visibleRows = isExpanded ? rows : rows.slice(0, VISIBLE_CATEGORY_ROWS);
  const hiddenRows = rows.slice(visibleRows.length);
  const hiddenAmount = useMemo(() => hiddenRows.reduce((sum, item) => sum + item.amount, 0), [hiddenRows]);

  const modes = [
    { key: 'expense', label: isEnglish ? 'Expenses' : 'Расходы' },
    { key: 'income', label: isEnglish ? 'Income' : 'Доходы' },
    { key: 'account', label: isEnglish ? 'Accounts' : 'Счета' },
  ];

  const emptyText = isIncome
    ? isEnglish
      ? 'No income recorded for this period.'
      : 'За период нет записанных доходов.'
    : mode === 'account'
      ? isEnglish
        ? 'No spending tied to an account in this period.'
        : 'За период нет трат, привязанных к счёту.'
      : isEnglish
        ? 'Add expenses with categories — then this block shows where the money goes.'
        : 'Добавь расходы с категориями — тогда здесь будет видно, куда уходят деньги.';

  return (
    <SectionCard theme={theme} className="space-y-2.5 p-3">
      <div className="flex items-center gap-2">
        <PieChart size={14} className="opacity-55" />
        <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'Where it goes' : 'Структура'}</p>
      </div>

      <div className="flex gap-1.5">
        {modes.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setMode(item.key);
              setIsExpanded(false);
            }}
            aria-pressed={mode === item.key}
            className={`min-h-[30px] rounded-full border px-3 text-[10px] font-semibold transition-all active:scale-[0.99] ${
              mode === item.key
                ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                : 'border-transparent bg-[var(--mc-soft)] opacity-70'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] leading-[1.35] opacity-55">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {visibleRows.map((item) => {
            const share = total > 0 ? Math.round((item.amount / total) * 100) : 0;

            return (
              <div key={item.category} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-[11px] font-semibold">{item.category}</p>
                  <div className="flex shrink-0 items-baseline gap-1.5">
                    <span className="font-numbers text-[11px] font-extrabold tabular-nums">{fmt(item.amount)}</span>
                    <span className="text-[10px] font-semibold tabular-nums opacity-55">{share}%</span>
                  </div>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--mc-soft)]">
                  <div
                    className={`mc-bar h-full rounded-full ${isIncome ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
                    style={{ width: `${Math.max(share, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {hiddenRows.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="min-h-[30px] w-full rounded-[16px] border border-dashed border-[var(--mc-border)] px-3 text-[10px] font-semibold opacity-55 transition-opacity hover:opacity-100"
            >
              {isEnglish
                ? `Show all (${rows.length}) — ${fmt(hiddenAmount)} more`
                : `Показать все (${rows.length}) — ещё ${fmt(hiddenAmount)}`}
            </button>
          ) : null}

          {isExpanded && rows.length > VISIBLE_CATEGORY_ROWS ? (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="min-h-[30px] w-full rounded-[16px] border border-dashed border-[var(--mc-border)] px-3 text-[10px] font-semibold opacity-55 transition-opacity hover:opacity-100"
            >
              {isEnglish ? 'Collapse' : 'Свернуть'}
            </button>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
