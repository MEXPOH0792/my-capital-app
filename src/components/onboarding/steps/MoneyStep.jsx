import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SectionCard } from '../../ui/AppUi.jsx';
import { PrimaryButton } from '../OnboardingShared.jsx';

const scrollFieldIntoView = (event) => {
  requestAnimationFrame(() => {
    event.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
};

export default function MoneyStep({
  copy,
  onboardingCopy,
  theme,
  panelStyle,
  softPanelStyle,
  totalMoney,
  accountFields,
  balances,
  setBalances,
  onBack,
  onNext,
}) {
  const renderAccount = (field) => {
    const label = copy.accountNames?.[field.key] || field.label;
    return (
      <label key={field.key} className="block rounded-[12px] border p-3" style={softPanelStyle}>
        <span className="block text-base font-semibold">{label}</span>
        <span className="mt-1 block text-sm leading-relaxed opacity-80">{copy.accountHints?.[field.key]}</span>
        <input
          type="text"
          inputMode="decimal"
          value={balances[field.key] || ''}
          onChange={(event) =>
            setBalances((prev) => ({ ...prev, [field.key]: event.target.value.replace(/[^\d\s.,]/g, '') }))
          }
          onFocus={scrollFieldIntoView}
          placeholder="0"
          className="mt-2 min-h-[48px] w-full rounded-[12px] border border-[var(--mc-border)] bg-[var(--mc-soft)] px-3 py-2 text-xl font-numbers tabular-nums"
        />
      </label>
    );
  };

  return (
    <div className="space-y-4">
      <SectionCard theme={theme} tone="hero" className="p-4">
        <h1 className="font-display text-2xl font-bold leading-tight">{copy.title}</h1>
        <p className="mt-2 text-base leading-relaxed opacity-80">{copy.body}</p>
      </SectionCard>

      <SectionCard theme={theme} className="space-y-3 p-3">
        {accountFields.filter((field) => !field.protected).map(renderAccount)}
        <details>
          <summary className="flex min-h-[48px] cursor-pointer items-center text-base font-semibold">
            {copy.savingsToggle}
          </summary>
          <p className="mb-3 text-sm leading-relaxed opacity-80">{copy.savingsHint}</p>
          <div className="space-y-3">{accountFields.filter((field) => field.protected).map(renderAccount)}</div>
        </details>
        <div className="flex items-center justify-between gap-3 rounded-[12px] border p-3" style={panelStyle}>
          <span className="text-base">{copy.currentBase}</span>
          <strong className="text-xl font-numbers tabular-nums">{totalMoney}</strong>
        </div>
      </SectionCard>

      <p className="text-sm leading-relaxed opacity-80">{copy.zeroHint}</p>
      <div className="flex gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={onboardingCopy.back}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[12px] border"
            style={{ borderColor: theme.border }}
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <PrimaryButton onClick={onNext}>{onboardingCopy.continue}</PrimaryButton>
      </div>
    </div>
  );
}
