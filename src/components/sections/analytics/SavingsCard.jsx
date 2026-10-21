import { Wallet } from 'lucide-react';
import { SectionCard } from '../../ui/primitives.jsx';
import DeltaBadge from './DeltaBadge.jsx';
import { SAVINGS_TONE_CLASS, getSavingsVerdict } from './reportNotes.js';

/**
 * The headline answer of the report: how much of the period's income survived.
 * Renders nothing when the summary is unavailable, so callers that do not
 * supply it (e.g. smoke tests) keep working.
 */
export default function SavingsCard({
  periodSummary,
  goalPace,
  periodComparison,
  fmt,
  isEnglish,
  theme,
  softPanelStyle,
}) {
  if (!periodSummary) return null;

  const { saved, savingsRate, tone } = periodSummary;
  const hasRate = savingsRate !== null && tone !== null;
  const toneClass = hasRate ? SAVINGS_TONE_CLASS[tone] : '';
  const monthsToGoal = goalPace?.monthsToGoal ?? null;

  return (
    <SectionCard theme={theme} className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold opacity-55">
              {isEnglish ? 'Kept this period' : 'Сохранено за период'}
            </p>
            <DeltaBadge delta={periodComparison?.saved} polarity="goodUp" isEnglish={isEnglish} />
          </div>
          <p className="mt-1 min-w-0 font-numbers font-extrabold tabular-nums leading-none tracking-[-0.035em] [overflow-wrap:anywhere] text-[clamp(1.15rem,6.2vw,1.55rem)]">
            {fmt(saved)}
          </p>
        </div>
        {hasRate ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums ${toneClass}`}
          >
            {savingsRate}%
          </span>
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--mc-soft)] opacity-55">
            <Wallet size={13} />
          </div>
        )}
      </div>

      <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
        <p className="text-[12px] font-bold leading-[1.35]">
          {hasRate
            ? getSavingsVerdict(tone, isEnglish)
            : isEnglish
              ? 'No income in this period — the savings rate cannot be calculated.'
              : 'За период не было доходов — норма сбережений не считается.'}
        </p>
        {monthsToGoal !== null ? (
          <p className="mt-1.5 text-[10px] leading-[1.3] opacity-55">
            {isEnglish
              ? `At this pace (about ${fmt(goalPace.monthlySaving)} per month) the capital goal is roughly ${monthsToGoal} months away.`
              : `При таком темпе (около ${fmt(goalPace.monthlySaving)} в месяц) цель капитала — примерно ${monthsToGoal} мес.`}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
