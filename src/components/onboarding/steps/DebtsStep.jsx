import React from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { MetricCard, SectionCard } from '../../ui/AppUi.jsx';
import { FormField, PrimaryButton } from '../OnboardingShared.jsx';

export default function DebtsStep({
  copy,
  onboardingCopy,
  theme,
  panelStyle,
  softPanelStyle,
  debts,
  totalDebt,
  addDebt,
  updateDebt,
  removeDebt,
  formatInput,
  onBack,
  onNext,
  onMoreSetup,
  incomeSplit,
}) {
  const savingsPercent = (incomeSplit?.safety || 0) + (incomeSplit?.capital || 0);
  return (
    <div className="space-y-4">
      <SectionCard theme={theme} tone="hero" className="p-4">
        <h1 className="font-display text-2xl font-bold leading-tight">{copy.title}</h1>
        <p className="mt-2 text-base leading-relaxed opacity-80">{copy.body}</p>
      </SectionCard>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <MetricCard label={copy.activeDebts} value={debts.length} theme={theme} compact />
        <MetricCard label={copy.totalDebts} value={totalDebt} theme={theme} compact />
      </div>

      {debts.length === 0 ? (
        <div className="rounded-[16px] border p-1.5" style={panelStyle}>
          <div>
            <PrimaryButton onClick={addDebt}>{copy.emptyPrimaryCta}</PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {debts.map((item) => (
            <div key={item.id} className="rounded-[16px] border p-2.5" style={panelStyle}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-[13px] font-black">{item.title || copy.newDebt}</p>
                <button type="button" onClick={() => removeDebt(item.id)} className="opacity-55">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <FormField label={copy.debtTitle}>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateDebt(item.id, 'title', e.target.value)}
                    placeholder={copy.debtTitlePlaceholder}
                    className="min-h-[48px] w-full rounded-[12px] border bg-transparent px-3 py-2 text-base font-semibold outline-none"
                    style={softPanelStyle}
                  />
                </FormField>

                <FormField label={copy.amount}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.amount}
                    onChange={(e) => updateDebt(item.id, 'amount', formatInput(e.target.value))}
                    placeholder="0"
                    className="min-h-[48px] w-full rounded-[12px] border bg-transparent px-3 py-2 text-base font-bold font-numbers tabular-nums outline-none"
                    style={softPanelStyle}
                  />
                </FormField>

                <FormField label={copy.bankOrPerson}>
                  <input
                    type="text"
                    value={item.bankName}
                    onChange={(e) => updateDebt(item.id, 'bankName', e.target.value)}
                    placeholder={copy.bankOrPersonPlaceholder}
                    className="min-h-[48px] w-full rounded-[12px] border bg-transparent px-3 py-2 text-base font-semibold outline-none"
                    style={softPanelStyle}
                  />
                </FormField>

                <FormField label={copy.interestRate}>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.interestRate}
                      onChange={(e) => updateDebt(item.id, 'interestRate', e.target.value.replace(',', '.'))}
                      placeholder="0"
                      className="min-h-[48px] w-full rounded-[12px] border bg-transparent px-3 py-2 pr-14 text-base font-bold outline-none"
                      style={softPanelStyle}
                    />
                    <div
                      className="pointer-events-none absolute right-2.5 top-1/2 flex h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-xl px-2.5 text-[12px] font-black"
                      style={{ backgroundColor: `${theme.accent}22`, color: theme.accent }}
                    >
                      %
                    </div>
                  </div>
                </FormField>
              </div>
            </div>
          ))}
        </div>
      )}

      {debts.length > 0 ? <button
        type="button"
        onClick={addDebt}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] border border-dashed px-4 py-2 text-base font-semibold opacity-70 transition-transform active:scale-[0.99]"
        style={{ borderColor: theme.border }}
      >
        <Plus size={14} />
        {copy.addAnother}
      </button> : null}

      <div className="rounded-[16px] border p-1.5" style={panelStyle}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[12px] border bg-[var(--mc-soft)] transition-transform active:scale-[0.98]"
            style={{ borderColor: theme.border }}
          >
            <ArrowLeft size={16} />
          </button>
          <PrimaryButton onClick={onNext}>{copy.finishCta || onboardingCopy.continue}</PrimaryButton>
        </div>
        {onMoreSetup ? (
          <>
            <p className="px-2 pt-3 text-sm leading-relaxed opacity-80">{copy.savingRule?.(savingsPercent)}</p>
            <button
              type="button"
              onClick={onMoreSetup}
              className="mt-2 min-h-[48px] w-full rounded-[12px] px-4 text-base font-semibold opacity-70"
            >
              {copy.moreSetupCta}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
