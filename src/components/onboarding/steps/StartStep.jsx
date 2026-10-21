import React from 'react';
import { SectionCard } from '../../ui/AppUi.jsx';
import { PrimaryButton } from '../OnboardingShared.jsx';

export default function StartStep({ copy, theme, isReconfigureMode, hasLiveHistory, onNext }) {
  return (
    <div className="space-y-2">
      <SectionCard theme={theme} tone="hero" className="px-4 py-3 sm:px-4 sm:py-3">
        <p className="text-[10px] font-semibold " style={{ color: theme.accent }}>
          {copy.badge}
        </p>
        <h1 className="mt-1 max-w-[8ch] font-display text-[clamp(1.28rem,6.8vw,1.62rem)] font-black leading-[0.95] tracking-[-0.05em] [text-wrap:balance]">
          {copy.title}
        </h1>
        <p className="mt-1 max-w-md text-[10px] leading-[1.35] opacity-70">{copy.body}</p>
      </SectionCard>

      {isReconfigureMode && hasLiveHistory ? (
        <div className="rounded-[16px] border border-red-500/20 bg-red-500/5 px-3.5 py-2 text-[10px] leading-[1.35] text-[var(--mc-negative)]">
          {copy.reconfigureWarning}
        </div>
      ) : null}

      <PrimaryButton onClick={onNext} className="text-[11px]">
        {isReconfigureMode ? copy.reconfigureCta : copy.cta}
      </PrimaryButton>
    </div>
  );
}
