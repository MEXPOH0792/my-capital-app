/**
 * Tells the user where this expense leaves the category's monthly ceiling,
 * while they can still change their mind.
 *
 * Stays silent when the category has no limit — inventing a ceiling would be
 * worse than saying nothing.
 */
export default function LimitWarning({ forecast, fmt, isEnglish }) {
  if (!forecast) return null;

  const { limit, projected, remaining, status } = forecast;
  const percent = Math.round((projected / limit) * 100);

  const toneClass =
    status === 'exceeded'
      ? 'border-red-500/25 bg-red-500/10 text-[var(--mc-negative)]'
      : status === 'warning'
        ? 'border-amber-500/25 bg-amber-500/10 text-[var(--mc-warning)]'
        : 'border-emerald-500/25 bg-emerald-500/10 text-[var(--mc-positive)]';

  const message =
    status === 'exceeded'
      ? isEnglish
        ? `Over the limit by ${fmt(Math.abs(remaining))}.`
        : `Лимит превышен на ${fmt(Math.abs(remaining))}.`
      : isEnglish
        ? `${fmt(remaining)} left of ${fmt(limit)} this month.`
        : `Останется ${fmt(remaining)} из ${fmt(limit)} на месяц.`;

  return (
    <div className={`rounded-[16px] border px-3 py-2 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[11px] font-semibold leading-[1.3]">{message}</p>
        <span className="shrink-0 text-[10px] font-semibold tabular-nums">{percent}%</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--mc-soft)]">
        <div
          className="mc-bar h-full rounded-full bg-current"
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>
    </div>
  );
}
