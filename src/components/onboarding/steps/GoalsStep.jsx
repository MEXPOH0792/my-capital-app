import React from 'react';
import { ArrowLeft, Target } from 'lucide-react';
import { SectionCard } from '../../ui/AppUi.jsx';
import { PrimaryButton } from '../OnboardingShared.jsx';

const scrollFieldIntoView = (event) => {
  requestAnimationFrame(() => {
    event.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
};

const formatGroupedIntegerInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.replace(/^0+(?=\d)/, '') || '0';
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export default function GoalsStep({
  copy,
  theme,
  panelStyle,
  softPanelStyle,
  targets,
  setTargets,
  allocationModes,
  onboardingMode,
  setOnboardingMode,
  isReconfigureMode,
  onBack,
  onSubmit,
}) {
  const getPayYourselfPercent = (modeKey, mode) => {
    if (modeKey === 'custom') return null;
    return (mode?.allocation?.safety || 0) + (mode?.allocation?.capital || 0);
  };

  return (
    <div className="space-y-1.5">
      <SectionCard theme={theme} tone="hero" className="px-3.5 py-2.5">
        <p className="text-[10px] font-semibold " style={{ color: theme.accent }}>
          {copy.badge}
        </p>
        <h1 className="mt-1 max-w-[7.5ch] font-display text-[clamp(1.12rem,5.6vw,1.34rem)] font-black leading-[0.96] tracking-[-0.05em] [text-wrap:balance]">
          {copy.title}
        </h1>
      </SectionCard>

      <SectionCard theme={theme} className="p-2">
        <div className="mb-1">
          <p className="text-[10px] font-semibold opacity-55">{copy.targetsTitle}</p>
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <div className="rounded-[12px] border p-1.5" style={softPanelStyle}>
            <div className="flex items-center gap-2">
              <Target size={13} />
              <p className="text-[12px] font-black">{copy.safetyTarget}</p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={targets.targetSafety}
              onChange={(e) =>
                setTargets((prev) => ({ ...prev, targetSafety: formatGroupedIntegerInput(e.target.value) }))
              }
              onFocus={scrollFieldIntoView}
              placeholder="500 000"
              className="mt-1 w-full min-w-0 rounded-[12px] border border-[var(--mc-border-soft)] bg-black/10 px-2.5 py-1 text-[clamp(0.82rem,4.8vw,0.96rem)] font-black font-numbers tabular-nums tracking-[-0.035em] outline-none placeholder:opacity-40"
            />
          </div>
          <div className="rounded-[12px] border p-1.5" style={softPanelStyle}>
            <div className="flex items-center gap-2">
              <Target size={13} />
              <p className="text-[12px] font-black">{copy.capitalTarget}</p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={targets.targetCapital}
              onChange={(e) =>
                setTargets((prev) => ({ ...prev, targetCapital: formatGroupedIntegerInput(e.target.value) }))
              }
              onFocus={scrollFieldIntoView}
              placeholder="1 000 000"
              className="mt-1 w-full min-w-0 rounded-[12px] border border-[var(--mc-border-soft)] bg-black/10 px-2.5 py-1 text-[clamp(0.82rem,4.8vw,0.96rem)] font-black font-numbers tabular-nums tracking-[-0.035em] outline-none placeholder:opacity-40"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard theme={theme} className="p-2">
        <div className="mb-1">
          <p className="text-[10px] font-semibold opacity-55">{copy.savingModeTitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(allocationModes).map(([key, mode]) => (
            <button
              key={key}
              type="button"
              onClick={() => setOnboardingMode(key)}
              className={`w-full rounded-[12px] border px-2.5 py-1.5 text-left transition-all ${
                onboardingMode === key
                  ? 'border-emerald-500 bg-emerald-500/12 shadow-[0_8px_18px_rgba(16,185,129,0.12)]'
                  : 'border-transparent bg-[var(--mc-soft)]'
              }`}
            >
              <div className="flex min-h-[30px] flex-col justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-[11px] font-black leading-[1.08]">{mode.label}</p>
                </div>
                {getPayYourselfPercent(key, mode) !== null ? (
                  <span
                    className={`w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      onboardingMode === key
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-[var(--mc-positive)]'
                        : 'border-[var(--mc-border)] bg-[var(--mc-soft)] opacity-70'
                    }`}
                  >
                    {getPayYourselfPercent(key, mode)}% {copy.percentToSelf}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="rounded-[12px] border p-1.5" style={panelStyle}>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-[12px] border bg-[var(--mc-soft)] transition-transform active:scale-[0.98]"
            style={{ borderColor: theme.border }}
          >
            <ArrowLeft size={15} />
          </button>
          <PrimaryButton onClick={onSubmit} light className="min-h-[40px]">
            {isReconfigureMode ? copy.reconfigureCta : copy.cta}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
