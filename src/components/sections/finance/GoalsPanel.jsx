import { ShieldCheck, Target } from 'lucide-react';
import { SectionCard, SectionHeader } from '../../ui/AppUi.jsx';

export default function GoalsPanel({ copy, store, theme, text, onOpenTargetCapital, onOpenTargetSafety, fmt }) {
  return (
    <div className="space-y-3">
      <SectionCard theme={theme} className="space-y-2 p-3" tone="utility">
        <SectionHeader eyebrow={copy.settings.financialGoals} title={text.goalsTitle} compact />

        <button
          type="button"
          onClick={onOpenTargetCapital}
          className="w-full rounded-[16px] border px-3 py-2 text-left transition-all hover:bg-emerald-500/5"
          style={{ borderColor: theme.border }}
        >
          <div className="flex flex-col items-stretch gap-1.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-[var(--mc-positive)]">
                <Target size={14} />
              </div>
              <span className="min-w-0 text-sm font-bold">{copy.settings.capital}</span>
            </div>
            <span className="min-w-0 text-right text-sm font-black [overflow-wrap:anywhere]">
              {fmt(store.targetCapital)}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenTargetSafety}
          className="w-full rounded-[16px] border px-3 py-2 text-left transition-all hover:bg-amber-500/5"
          style={{ borderColor: theme.border }}
        >
          <div className="flex flex-col items-stretch gap-1.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-[var(--mc-warning)]">
                <ShieldCheck size={14} />
              </div>
              <span className="min-w-0 text-sm font-bold">{copy.settings.safety}</span>
            </div>
            <span className="min-w-0 text-right text-sm font-black [overflow-wrap:anywhere]">
              {fmt(store.targetSafety)}
            </span>
          </div>
        </button>
      </SectionCard>
    </div>
  );
}
