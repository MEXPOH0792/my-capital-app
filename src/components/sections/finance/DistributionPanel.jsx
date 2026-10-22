import { useState } from 'react';
import { AllocationInput, SectionCard, SectionHeader } from '../../ui/AppUi.jsx';

function PreviewRow({ label, value, share, theme }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border px-3 py-2"
      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold opacity-80">{label}</p>
        <p className="mt-0.5 text-[13px] font-numbers font-extrabold">{value}</p>
      </div>
      {typeof share === 'number' ? (
        <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-sm font-semibold text-[var(--mc-positive)]">
          {share}%
        </span>
      ) : null}
    </div>
  );
}

export default function DistributionPanel({ copy, store, theme, softPanelStyle, distribution, fmt, isEnglish }) {
  const {
    showAdvancedDistribution,
    setShowAdvancedDistribution,
    allocationModes,
    setAllocationForm,
    allocationForm,
    handleAllocationInput,
    currentMode,
    payYourselfPercent,
    availableForObligations,
    previewReservedForRequired,
    previewDistribution,
    totalRequiredExpenses,
    obligationsDelta,
    allocationTotal,
    saveAllocationSettings,
  } = distribution;

  const [showSchemeDetails, setShowSchemeDetails] = useState(false);
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);

  const autoDistributionDescription = isEnglish
    ? 'Before spending starts, part of income goes to savings automatically.'
    : 'Приложение считает, сколько отложить из дохода.';
  const advancedBasisLabel =
    store.incomeDistributionBasis === 'total_income' ? copy.settings.totalIncome : copy.settings.freeAfterRequired;
  const customMode = store.incomeDistributionMode === 'custom';
  const currentSchemeSummary = `${copy.settings.toBalance} ${store.allocationPercents.balance}% · ${copy.settings.toSafety} ${store.allocationPercents.safety}% · ${copy.settings.toCapital} ${store.allocationPercents.capital}% · ${copy.settings.toSadaka} ${store.allocationPercents.sadaka}%`;
  const previewSummary = `${copy.settings.toBalance} ${fmt(previewDistribution.toBalance)} · ${copy.settings.toSafety} ${fmt(previewDistribution.toSafety)}`;
  const schemeToggleLabel = showSchemeDetails ? copy.settings.hide : isEnglish ? 'Show' : 'Показать';
  const previewToggleLabel = showPreviewDetails ? copy.settings.hide : isEnglish ? 'Show' : 'Показать';

  return (
    <div className="space-y-3">
      <SectionCard theme={theme} className="space-y-3 p-3.5">
        <SectionHeader eyebrow={copy.settings.incomeDistribution} compact />

        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border px-3 py-2.5"
          style={softPanelStyle}
        >
          <div className="min-w-0">
            <p className="text-sm font-black">{copy.settings.autoDistribution}</p>
            <p className="mt-0.5 text-sm leading-[1.3] opacity-80">{autoDistributionDescription}</p>
          </div>
          <button
            type="button"
            onClick={store.toggleIncomeDistribution}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold transition-all ${
              store.incomeDistributionEnabled
                ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                : 'opacity-70'
            }`}
            style={{ borderColor: store.incomeDistributionEnabled ? undefined : theme.border }}
          >
            {store.incomeDistributionEnabled ? copy.settings.enabled : copy.settings.disabled}
          </button>
        </div>

        {store.incomeDistributionEnabled ? (
          <>
            <div className="space-y-1.5">
              <p className="px-1 text-sm font-semibold opacity-80">{copy.settings.howToSave}</p>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(allocationModes).map(([modeKey, mode]) => {
                  const payToSelf = modeKey === 'custom' ? null : mode.allocation.safety + mode.allocation.capital;
                  const active = store.incomeDistributionMode === modeKey;

                  return (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() => {
                        store.setIncomeDistributionMode(modeKey);
                        if (modeKey !== 'custom') {
                          setAllocationForm(allocationModes[modeKey].allocation);
                        }
                      }}
                      className={`w-full rounded-[12px] border px-3 py-1.5 text-left transition-all ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-transparent bg-[var(--mc-soft)]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-black leading-snug">{mode.label}</span>
                        {payToSelf !== null ? (
                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-sm font-semibold ${
                              active
                                ? 'border-emerald-400/30 bg-emerald-500/12 text-[var(--mc-positive)]'
                                : 'border-[var(--mc-border)] bg-[var(--mc-soft)] opacity-70'
                            }`}
                          >
                            {payToSelf}% {copy.settings.toYou}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-[16px] border px-3 py-2.5"
              style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold opacity-80">{copy.settings.shortSummary}</p>
                  <p className="mt-1 text-sm font-bold leading-[1.3]">
                    {currentMode.label} · {payYourselfPercent}% {copy.settings.toYou}
                  </p>
                  <p className="mt-0.5 text-sm leading-[1.3] opacity-80">
                    {copy.settings.leftForLife}: {fmt(availableForObligations)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-sm font-semibold ${
                    obligationsDelta >= 0
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-[var(--mc-positive)]'
                      : 'border-red-400/20 bg-red-500/10 text-[var(--mc-negative)]'
                  }`}
                >
                  {obligationsDelta >= 0
                    ? `${copy.settings.surplus}: ${fmt(obligationsDelta)}`
                    : `${copy.settings.deficit}: ${fmt(Math.abs(obligationsDelta))}`}
                </span>
              </div>
            </div>

            <div
              className="rounded-[16px] border px-3 py-2.5"
              style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold opacity-80">{copy.settings.howToCalculate}</p>
                  <p className="mt-0.5 text-sm font-bold leading-[1.3]">{advancedBasisLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedDistribution((prev) => !prev)}
                  className="shrink-0 rounded-full border px-3 py-1 text-sm font-semibold transition-all"
                  style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                >
                  {showAdvancedDistribution ? copy.settings.hide : copy.settings.change}
                </button>
              </div>
            </div>

            {showAdvancedDistribution ? (
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => store.setIncomeDistributionBasis('total_income')}
                  className={`w-full rounded-[12px] border px-3 py-1.5 text-left transition-all ${
                    store.incomeDistributionBasis === 'total_income'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-transparent bg-[var(--mc-soft)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-black leading-[1.35]">{copy.settings.totalIncome}</span>
                    <span className="shrink-0 text-sm font-semibold opacity-80">{copy.settings.totalIncomeHint}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => store.setIncomeDistributionBasis('free_after_required')}
                  className={`w-full rounded-[12px] border px-3 py-1.5 text-left transition-all ${
                    store.incomeDistributionBasis === 'free_after_required'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-transparent bg-[var(--mc-soft)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-black leading-[1.35]">{copy.settings.freeAfterRequired}</span>
                    <span className="shrink-0 text-sm font-semibold opacity-80">
                      {copy.settings.freeAfterRequiredHint}
                    </span>
                  </div>
                </button>
              </div>
            ) : null}

            {customMode ? (
              <div className="grid grid-cols-2 gap-1.5">
                <AllocationInput
                  label={copy.settings.toBalance}
                  value={allocationForm.balance}
                  onChange={(value) => handleAllocationInput('balance', value)}
                  theme={theme}
                />
                <AllocationInput
                  label={copy.settings.toSafety}
                  value={allocationForm.safety}
                  onChange={(value) => handleAllocationInput('safety', value)}
                  theme={theme}
                />
                <AllocationInput
                  label={copy.settings.toCapital}
                  value={allocationForm.capital}
                  onChange={(value) => handleAllocationInput('capital', value)}
                  theme={theme}
                />
                <AllocationInput
                  label={copy.settings.toSadaka}
                  value={allocationForm.sadaka}
                  onChange={(value) => handleAllocationInput('sadaka', value)}
                  theme={theme}
                />
              </div>
            ) : (
              <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
                <button
                  type="button"
                  onClick={() => setShowSchemeDetails((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold opacity-80">{copy.settings.currentScheme}</p>
                    <p className="mt-0.5 text-sm font-bold leading-[1.3] [overflow-wrap:anywhere]">
                      {currentSchemeSummary}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold opacity-80">{schemeToggleLabel}</span>
                </button>
                {showSchemeDetails ? (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <PreviewRow
                      label={copy.settings.toBalance}
                      value={`${store.allocationPercents.balance}%`}
                      theme={theme}
                    />
                    <PreviewRow
                      label={copy.settings.toSafety}
                      value={`${store.allocationPercents.safety}%`}
                      theme={theme}
                    />
                    <PreviewRow
                      label={copy.settings.toCapital}
                      value={`${store.allocationPercents.capital}%`}
                      theme={theme}
                    />
                    <PreviewRow
                      label={copy.settings.toSadaka}
                      value={`${store.allocationPercents.sadaka}%`}
                      theme={theme}
                    />
                  </div>
                ) : null}
              </div>
            )}

            <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
              <button
                type="button"
                onClick={() => setShowPreviewDetails((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold opacity-80">{copy.settings.sampleIncome}</p>
                  <p className="mt-0.5 text-sm font-bold leading-[1.3] [overflow-wrap:anywhere]">{previewSummary}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold opacity-80">{previewToggleLabel}</span>
              </button>

              {showPreviewDetails ? (
                <>
                  <div className="mt-2 space-y-1.5">
                    {store.incomeDistributionBasis === 'free_after_required' ? (
                      <PreviewRow
                        label={copy.settings.reservedForRequired}
                        value={fmt(previewReservedForRequired)}
                        theme={theme}
                      />
                    ) : null}
                    <PreviewRow
                      label={copy.settings.toBalance}
                      value={fmt(previewDistribution.toBalance)}
                      share={store.allocationPercents.balance}
                      theme={theme}
                    />
                    <PreviewRow
                      label={copy.settings.toSafety}
                      value={fmt(previewDistribution.toSafety)}
                      share={store.allocationPercents.safety}
                      theme={theme}
                    />
                    <PreviewRow
                      label={copy.settings.toCapital}
                      value={fmt(previewDistribution.toCapital)}
                      share={store.allocationPercents.capital}
                      theme={theme}
                    />
                    <PreviewRow
                      label={copy.settings.toSadaka}
                      value={fmt(previewDistribution.toSadaka)}
                      share={store.allocationPercents.sadaka}
                      theme={theme}
                    />
                  </div>
                  <div
                    className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-3 py-2"
                    style={{ borderColor: theme.border }}
                  >
                    <span className="text-sm font-semibold opacity-80">{copy.settings.allocationTotal}</span>
                    <span
                      className={`shrink-0 text-sm font-black ${allocationTotal === 100 ? 'text-[var(--mc-positive)]' : 'text-[var(--mc-negative)]'}`}
                    >
                      {allocationTotal}%
                    </span>
                  </div>
                  <div
                    className="mt-2 rounded-[12px] border px-3 py-2 text-sm leading-[1.3]"
                    style={{ borderColor: theme.border }}
                  >
                    <p className="text-sm font-semibold opacity-80">{copy.settings.obligationsLoad}</p>
                    <p className="mt-1">
                      {copy.settings.requiredPerMonth}: {fmt(totalRequiredExpenses)}
                    </p>
                    <p>
                      {store.incomeDistributionEnabled
                        ? copy.settings.leftForLife
                        : copy.settings.leftIfDistributionOff}
                      : {fmt(availableForObligations)}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {customMode ? (
              <button
                type="button"
                onClick={saveAllocationSettings}
                disabled={allocationTotal !== 100}
                className="w-full rounded-[16px] bg-emerald-600 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-80"
              >
                {copy.settings.saveDistribution}
              </button>
            ) : null}
          </>
        ) : null}
      </SectionCard>
    </div>
  );
}
