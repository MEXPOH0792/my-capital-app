import { fromMinorUnits } from '../../utils/money.js';

export function SummaryCard({ label, value, color, theme, compact = false }) {
  return (
    <div
      className={`border ${compact ? 'rounded-[16px] px-3 py-2' : 'rounded-[16px] px-3.5 py-3 md:rounded-[22px]'}`}
      style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
    >
      <p className={`${compact ? 'text-[10px]' : 'text-[10px]'} font-semibold opacity-40`}>{label}</p>
      <p
        className={`font-numbers font-extrabold [overflow-wrap:anywhere] ${compact ? 'mt-1 text-[clamp(0.96rem,4.2vw,1.08rem)]' : 'mt-1.5 text-[clamp(1rem,4.6vw,1.2rem)]'}`}
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

export function AdvisorCard({ insight, theme, copy }) {
  const tones = {
    red: {
      border: 'rgba(239,68,68,0.18)',
      bg: 'rgba(239,68,68,0.08)',
      badge: 'text-[var(--mc-negative)]',
      title: 'text-[var(--mc-negative)]',
    },
    amber: {
      border: 'rgba(245,158,11,0.18)',
      bg: 'rgba(245,158,11,0.08)',
      badge: 'text-[var(--mc-warning)]',
      title: 'text-[var(--mc-warning)]',
    },
    blue: {
      border: 'rgba(16,185,129,0.18)',
      bg: 'rgba(16,185,129,0.08)',
      badge: 'text-[var(--mc-positive)]',
      title: 'text-[var(--mc-positive)]',
    },
    green: {
      border: 'rgba(34,197,94,0.18)',
      bg: 'rgba(34,197,94,0.08)',
      badge: 'text-[var(--mc-positive)]',
      title: 'text-[var(--mc-positive)]',
    },
  };

  const tone = tones[insight.tone] || tones.blue;

  return (
    <div
      className="rounded-[16px] border px-3 py-2.5"
      style={{ backgroundColor: theme.surface, borderColor: tone.border, boxShadow: theme.panelShadow }}
    >
      <div
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold "
        style={{ backgroundColor: tone.bg }}
      >
        <span className={tone.badge}>{insight.badge}</span>
      </div>
      <h3 className={`mt-1.5 text-[0.98rem] leading-[1.08] font-display font-extrabold ${tone.title}`}>
        {insight.title}
      </h3>
      <p className="mt-1 text-[10px] leading-[1.35] opacity-70">{insight.summary}</p>
      <div
        className="mt-2 rounded-[12px] border px-3 py-2"
        style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
      >
        <p className="text-[10px] font-semibold opacity-55">{copy.advisor.actionNow}</p>
        <p className="mt-1 text-[11px] font-bold leading-[1.32]">{insight.action}</p>
      </div>
      <p className="mt-1.5 text-[10px] leading-[1.28] opacity-55">{insight.impact}</p>
    </div>
  );
}

export function GoalJourneyCard({ capital, previewCapitalGain, fmt, milestones, journey, theme, copy, locale }) {
  return (
    <div
      className="rounded-[16px] border px-3 py-2.5"
      style={{ backgroundColor: theme.surface, borderColor: theme.border, boxShadow: theme.panelShadow }}
    >
      <div className="flex items-start justify-between gap-3 md:gap-4">
        <div>
          <p className="text-[10px] font-semibold text-[var(--mc-positive)]">{copy.goal.title}</p>
          <h3 className="mt-1 text-[0.98rem] leading-[1.08] font-display font-extrabold [overflow-wrap:anywhere]">
            {copy.goal.nextMilestone}: {fmt(journey.next)}
          </h3>
        </div>
        <div
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold "
          style={{ backgroundColor: theme.surfaceSoft }}
        >
          {journey.completedCount} {copy.goal.stages}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div
          className="rounded-[12px] border px-3 py-2"
          style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
        >
          <p className="text-[10px] font-semibold opacity-40">{copy.goal.remainingToStep}</p>
          <p className="mt-1 text-[clamp(0.92rem,4.7vw,1.15rem)] leading-none font-numbers font-extrabold [overflow-wrap:anywhere]">
            {fmt(journey.remainingToNext)}
          </p>
        </div>
        <div
          className="rounded-[12px] border px-3 py-2"
          style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
        >
          <p className="text-[10px] font-semibold opacity-40">{copy.goal.remainingToGoal}</p>
          <p className="mt-1 text-[clamp(0.92rem,4.7vw,1.15rem)] leading-none font-numbers font-extrabold [overflow-wrap:anywhere]">
            {fmt(journey.remainingToTarget)}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] font-semibold opacity-55">
          <span>{copy.goal.currentStep}</span>
          <span>{Math.round(journey.stepProgress)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: theme.surfaceSoft }}>
          <div
            className="mc-bar h-full rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.35)]"
            style={{ width: `${journey.stepProgress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-55">
          <span>{journey.previous === 0 ? copy.goal.start : fmt(journey.previous)}</span>
          <span>{fmt(journey.next)}</span>
        </div>
      </div>

      <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
        {milestones.map((point) => {
          const isDone = capital >= point;
          const isCurrent = journey.next === point;
          return (
            <div
              key={point}
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isDone ? 'text-white' : isCurrent ? 'text-[var(--mc-positive)]' : 'opacity-55'}`}
              style={{
                backgroundColor: isDone ? theme.accent : isCurrent ? `${theme.accent}14` : theme.surfaceSoft,
                border: `1px solid ${isCurrent ? `${theme.accent}33` : theme.border}`,
              }}
            >
              {new Intl.NumberFormat(locale).format(Math.round(fromMinorUnits(point)))}
            </div>
          );
        })}
      </div>

      <div
        className="mt-2 hidden rounded-[12px] border px-3 py-2 sm:block"
        style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
      >
        <p className="text-[10px] font-semibold opacity-55">{copy.goal.nextIncomeLink}</p>
        <p className="mt-1 text-[11px] font-bold leading-[1.32]">
          {copy.goal.nextIncomeImpact(fmt(previewCapitalGain))}
        </p>
        <p className="mt-1 text-[10px] leading-[1.28] opacity-55">
          {journey.afterNext ? `${copy.goal.afterNext} ${fmt(journey.afterNext)}.` : copy.goal.finalStage}
        </p>
      </div>
    </div>
  );
}

export function StoragePlacementCard({ title, note, items, theme, fmt, compact = false }) {
  const showHeader = Boolean(title || (note && !compact));

  return (
    <div
      className={`rounded-[16px] border ${compact ? 'px-3 py-1.5' : 'px-4 py-4 md:px-4 md:py-4'}`}
      style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
    >
      {showHeader ? (
        <div className="space-y-1">
          {title ? <p className="text-[10px] font-semibold text-[var(--mc-positive)]">{title}</p> : null}
          {note && !compact ? <p className="text-xs leading-5 opacity-55">{note}</p> : null}
        </div>
      ) : null}
      <div className={`${showHeader ? 'mt-1.5 ' : ''}grid grid-cols-1 ${compact ? 'gap-1' : 'gap-2'} sm:grid-cols-2`}>
        {items.map((item) => (
          <div
            key={`${title || 'placement'}-${item.label}`}
            className={`rounded-[12px] border ${compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'}`}
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}
          >
            {compact ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold opacity-55">{item.label}</p>
                  <p className="mt-0.5 text-[13px] font-numbers font-extrabold">{fmt(item.value)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {typeof item.share === 'number' ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--mc-positive)]">
                      {item.share}%
                    </span>
                  ) : null}
                  <span className="text-xs opacity-40">›</span>
                </div>
              </div>
            ) : (
              <>
                <p className="truncate text-[10px] font-semibold opacity-55">{item.label}</p>
                <p className="mt-2 text-lg font-numbers font-extrabold">{fmt(item.value)}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
