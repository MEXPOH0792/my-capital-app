import { useState } from 'react';

/**
 * Paired income/expense bars, one column per month.
 *
 * Built from plain boxes rather than SVG: a chart this simple needs no path
 * maths, month labels stay crisp at any width, and theme tokens apply
 * directly. Either way no charting library is pulled in.
 *
 * Accessibility: each column is a button carrying the full figures in its
 * label, and the trend is stated as visible text by the caller — that reads
 * better than wrapping an interactive chart in role="img".
 */
export default function MonthlyBars({ series, fmt, isEnglish, locale, softPanelStyle }) {
  const [selectedKey, setSelectedKey] = useState(null);

  const buckets = Array.isArray(series) ? series : [];
  if (buckets.length === 0) return null;

  const peak = buckets.reduce((max, bucket) => Math.max(max, bucket.income, bucket.expenses), 0);
  const selected = buckets.find((bucket) => bucket.key === selectedKey) || buckets[buckets.length - 1];

  const shortMonth = (bucket) => new Date(bucket.year, bucket.month, 1).toLocaleDateString(locale, { month: 'short' });
  const longMonth = (bucket) =>
    new Date(bucket.year, bucket.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  // A bar with money in it never renders as a hairline, so a small month stays
  // visible next to a big one.
  const barHeight = (value) => {
    if (value <= 0) return 0;
    return Math.max(3, peak > 0 ? (value / peak) * 100 : 0);
  };

  const incomeLabel = isEnglish ? 'Income' : 'Доход';
  const expenseLabel = isEnglish ? 'Expenses' : 'Расход';

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1">
        {buckets.map((bucket) => {
          const isSelected = selected?.key === bucket.key;

          return (
            <button
              key={bucket.key}
              type="button"
              onClick={() => setSelectedKey(bucket.key)}
              aria-pressed={isSelected}
              aria-label={`${longMonth(bucket)}: ${incomeLabel} ${fmt(bucket.income)}, ${expenseLabel} ${fmt(bucket.expenses)}`}
              className={`min-w-0 flex-1 rounded-[8px] px-0.5 pb-1 pt-1 transition-colors ${
                isSelected ? 'bg-[var(--mc-soft)]' : ''
              }`}
            >
              <div className="flex h-16 items-end justify-center gap-[2px]">
                <div
                  className="w-1/2 max-w-[9px] rounded-t-[3px] bg-emerald-500/70"
                  style={{ height: `${barHeight(bucket.income)}%` }}
                />
                <div
                  className="w-1/2 max-w-[9px] rounded-t-[3px] bg-red-500/70"
                  style={{ height: `${barHeight(bucket.expenses)}%` }}
                />
              </div>
              <p className={`mt-1 truncate text-[10px] font-semibold ${isSelected ? 'opacity-100' : 'opacity-55'}`}>
                {shortMonth(bucket)}
              </p>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-[16px] border px-3 py-2" style={softPanelStyle}>
          <p className="min-w-0 truncate text-[10px] font-semibold opacity-55">{longMonth(selected)}</p>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="font-numbers text-[10px] font-extrabold tabular-nums text-[var(--mc-positive)]">
              {fmt(selected.income)}
            </span>
            <span className="font-numbers text-[10px] font-extrabold tabular-nums text-[var(--mc-negative)]">
              {fmt(selected.expenses)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
