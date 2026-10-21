import React from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { MetricCard, SectionCard } from '../../ui/AppUi.jsx';
import { FormField, PrimaryButton } from '../OnboardingShared.jsx';

export default function RequiredExpensesStep({
  copy,
  onboardingCopy,
  theme,
  panelStyle,
  softPanelStyle,
  requiredExpenses,
  totalRequired,
  addRequiredExpense,
  updateRequiredExpense,
  removeRequiredExpense,
  formatInput,
  onBack,
  onNext,
}) {
  return (
    <div className="space-y-2">
      <SectionCard theme={theme} tone="hero" className="px-4 py-3">
        <p className="text-[10px] font-semibold " style={{ color: theme.accent }}>
          {copy.badge}
        </p>
        <h1 className="mt-1 max-w-[7ch] font-display text-[clamp(1.22rem,6.4vw,1.48rem)] font-black leading-[0.97] tracking-[-0.05em] [text-wrap:balance]">
          {copy.title}
        </h1>
        <p className="mt-1 text-[10px] leading-[1.34] opacity-70">{copy.body}</p>
      </SectionCard>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <MetricCard label={copy.items} value={requiredExpenses.length} theme={theme} compact />
        <MetricCard label={copy.totalPerMonth} value={totalRequired} theme={theme} compact />
      </div>

      {requiredExpenses.length === 0 ? (
        <div className="rounded-[16px] border p-1.5" style={panelStyle}>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <PrimaryButton onClick={addRequiredExpense}>{copy.emptyPrimaryCta}</PrimaryButton>
            <button
              type="button"
              onClick={onNext}
              className="min-h-[44px] w-full rounded-[12px] border border-[var(--mc-border)] px-4 text-[10px] font-semibold opacity-70"
            >
              {copy.emptySecondaryCta}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {requiredExpenses.map((item) => (
            <div key={item.id} className="rounded-[16px] border p-2.5" style={panelStyle}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-[13px] font-black">{item.title || copy.itemFallback}</p>
                <button type="button" onClick={() => removeRequiredExpense(item.id)} className="opacity-55">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <FormField label={copy.itemName}>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateRequiredExpense(item.id, 'title', e.target.value)}
                    placeholder={copy.itemNamePlaceholder}
                    className="w-full rounded-[12px] border bg-transparent px-3 py-2 text-[12px] font-bold outline-none"
                    style={softPanelStyle}
                  />
                </FormField>

                <FormField label={copy.amount}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.amount}
                    onChange={(e) => updateRequiredExpense(item.id, 'amount', formatInput(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-[12px] border bg-transparent px-3 py-2 text-[12px] font-black font-numbers tabular-nums outline-none"
                    style={softPanelStyle}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRequiredExpense}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed px-4 py-2 text-[10px] font-semibold opacity-70 transition-transform active:scale-[0.99]"
        style={{ borderColor: theme.border }}
      >
        <Plus size={14} />
        {copy.addAnother}
      </button>

      <div className="rounded-[16px] border p-1.5" style={panelStyle}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border bg-[var(--mc-soft)] transition-transform active:scale-[0.98]"
            style={{ borderColor: theme.border }}
          >
            <ArrowLeft size={16} />
          </button>
          <PrimaryButton onClick={onNext}>{onboardingCopy.continue}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
