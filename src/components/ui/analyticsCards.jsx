export function AnalyticRow({ label, value, total, color }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[10px] font-semibold ">
        <span className="opacity-40">{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--mc-soft)]">
        <div
          className="mc-bar h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}
        />
      </div>
    </div>
  );
}

export function CategoryBreakdownCard({ title, items, total, theme, fmt, emptyText }) {
  const topItems = items.slice(0, 5);

  return (
    <div
      className="rounded-[22px] md:rounded-[22px] border px-4 md:px-5 py-4 md:py-5"
      style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
    >
      <p className="text-[10px] font-semibold opacity-55">{title}</p>
      {topItems.length === 0 ? (
        <p className="mt-4 text-sm opacity-55">{emptyText}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {topItems.map((item) => {
            const percent = total > 0 ? Math.round((item.amount / total) * 100) : 0;
            return (
              <div key={`${title}-${item.category}`} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate font-bold">{item.category}</span>
                  <span className="shrink-0 font-numbers font-extrabold">{fmt(item.amount)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--mc-soft)]">
                    <div className="mc-bar h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-10 text-right text-[10px] font-semibold opacity-55">{percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
