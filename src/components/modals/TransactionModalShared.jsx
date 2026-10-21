import { useState } from 'react';

/** Chips shown before the "show more" expander kicks in. */
const COLLAPSED_PRESET_COUNT = 8;

export const scrollFieldIntoView = (event) => {
  requestAnimationFrame(() => {
    event.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
};

export function ModalTitle({ copy, modal, selectedDebt }) {
  return (
    <h3 className="text-center text-[10px] font-semibold opacity-40">
      {modal === 'income'
        ? copy.modal.income
        : modal === 'edit_income'
          ? copy.history?.editIncome || 'Edit income'
          : modal === 'expense'
            ? copy.modal.expense
            : modal === 'edit_expense'
              ? copy.history?.editExpense || 'Edit expense'
              : modal === 'pay_debt'
                ? `${copy.modal.debt}: ${selectedDebt?.title}`
                : modal === 'set_target_capital'
                  ? copy.modal.targetCapital
                  : modal === 'set_target_safety'
                    ? copy.modal.targetSafety
                    : copy.modal.balance}
    </h3>
  );
}

export function AmountInput({ inputValue, setInputValue, formatInput }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={(event) => setInputValue(formatInput(event.target.value))}
      onFocus={scrollFieldIntoView}
      className="w-full bg-transparent text-center text-[clamp(1.9rem,12vw,2.5rem)] font-numbers font-extrabold outline-none"
      placeholder="0"
    />
  );
}

export function SubmitButton({ copy, handleAction, canSubmitAction }) {
  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={!canSubmitAction}
      className="w-full rounded-[16px] bg-emerald-600 py-3 text-[10px] font-semibold text-white shadow-xl shadow-emerald-600/20 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copy.modal.done}
    </button>
  );
}

export function CategorySection({
  modal,
  isEnglish,
  activeTransactionCategoryPresets,
  transactionCategoryForm,
  setTransactionCategoryForm,
  removeIncomePreset,
  removeExpensePreset,
  softPanelStyle,
}) {
  const [isManaging, setIsManaging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCustomManuallyOpen, setIsCustomManuallyOpen] = useState(false);

  const isCategoryModal =
    modal === 'income' || modal === 'edit_income' || modal === 'expense' || modal === 'edit_expense';
  if (!isCategoryModal) return null;

  const isIncomeModal = modal === 'income' || modal === 'edit_income';
  const presets = activeTransactionCategoryPresets || [];
  // A typed custom category always wins over a chip, so no chip should look
  // selected while the field has text in it.
  const hasCustomText = Boolean(transactionCategoryForm.custom.trim());
  const selectedPreset = hasCustomText ? '' : transactionCategoryForm.preset;
  const isCustomOpen = isCustomManuallyOpen || hasCustomText;

  const hasOverflow = presets.length > COLLAPSED_PRESET_COUNT;
  const visiblePresets = isExpanded || isManaging ? presets : presets.slice(0, COLLAPSED_PRESET_COUNT);
  const hiddenCount = presets.length - visiblePresets.length;

  const customLabel = isEnglish ? 'Custom category' : 'Своя категория';

  const removePreset = (item) => {
    if (selectedPreset === item) setTransactionCategoryForm((prev) => ({ ...prev, preset: '' }));
    if (isIncomeModal) removeIncomePreset?.(item);
    else removeExpensePreset?.(item);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'Category' : 'Категория'}</p>
          {presets.length ? (
            <button
              type="button"
              onClick={() => setIsManaging((prev) => !prev)}
              className={`rounded-full px-2 py-1 text-[10px] font-semibold transition-opacity ${
                isManaging ? 'text-[var(--mc-positive)]' : 'opacity-55 hover:opacity-100'
              }`}
            >
              {isManaging ? (isEnglish ? 'Done' : 'Готово') : isEnglish ? 'Edit' : 'Изменить'}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {visiblePresets.map((item) => {
            const isSelected = selectedPreset === item;

            if (isManaging) {
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => removePreset(item)}
                  aria-label={isEnglish ? `Remove ${item}` : `Удалить ${item}`}
                  className="flex min-h-[34px] items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 text-[11px] font-semibold text-[var(--mc-negative)] transition-transform active:scale-95"
                >
                  <span>{item}</span>
                  <span aria-hidden="true" className="text-[12px] font-black leading-none">
                    ×
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTransactionCategoryForm({ preset: item, custom: '' });
                  setIsCustomManuallyOpen(false);
                }}
                aria-pressed={isSelected}
                className={`min-h-[34px] rounded-full border px-3 text-[11px] font-semibold transition-transform active:scale-95 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/12 text-[var(--mc-positive)]'
                    : 'border-[var(--mc-border)] bg-[var(--mc-soft)] text-[var(--mc-text-dim)]'
                }`}
              >
                {item}
              </button>
            );
          })}

          {hasOverflow && !isManaging ? (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="min-h-[34px] rounded-full border border-dashed border-[var(--mc-border)] px-3 text-[11px] font-semibold opacity-55 transition-opacity hover:opacity-100"
            >
              {isExpanded ? (isEnglish ? 'Less' : 'Свернуть') : `+${hiddenCount}`}
            </button>
          ) : null}
        </div>

        {isManaging ? (
          <p className="text-[10px] leading-[1.35] opacity-55">
            {isEnglish
              ? 'Tap a category to remove it from the list. Past entries keep it.'
              : 'Нажми на категорию, чтобы убрать её из списка. В прошлых записях она останется.'}
          </p>
        ) : null}
      </div>

      {isCustomOpen ? (
        <label className="block space-y-1">
          <span className="block text-[10px] font-semibold opacity-55">{customLabel}</span>
          <input
            type="text"
            value={transactionCategoryForm.custom}
            onChange={(event) => setTransactionCategoryForm((prev) => ({ ...prev, custom: event.target.value }))}
            onFocus={scrollFieldIntoView}
            placeholder={customLabel}
            className="w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
            style={softPanelStyle}
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setIsCustomManuallyOpen(true)}
          className="min-h-[34px] w-full rounded-[16px] border border-dashed border-[var(--mc-border)] px-3 text-[11px] font-semibold opacity-55 transition-opacity hover:opacity-100"
        >
          + {customLabel}
        </button>
      )}
    </div>
  );
}

export function IncomeDistributionSection({ allocationModes, store, copy, isEnglish, softPanelStyle }) {
  const incomeDistributionModes = allocationModes ? Object.entries(allocationModes) : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2" style={softPanelStyle}>
        <div className="min-w-0">
          <p className="text-[13px] font-bold">{copy.settings.autoDistribution}</p>
          <p className="mt-0.5 text-[10px] leading-[1.3] opacity-55">
            {isEnglish
              ? 'Before spending starts, part of income goes to savings automatically.'
              : 'До начала трат часть дохода автоматически уходит в накопления.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-[10px] font-semibold opacity-70">
            {store.incomeDistributionEnabled ? copy.settings.enabled : copy.settings.disabled}
          </span>
          <button
            type="button"
            onClick={store.toggleIncomeDistribution}
            aria-label={copy.settings.autoDistribution}
            className={`relative h-6 w-11 rounded-full border transition-all ${
              store.incomeDistributionEnabled
                ? 'border-emerald-400/50 bg-emerald-500/20'
                : 'border-[var(--mc-border)] bg-[var(--mc-soft)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all ${
                store.incomeDistributionEnabled ? 'left-[1.4rem] bg-emerald-400' : 'left-1 bg-[var(--mc-knob)]'
              }`}
            />
          </button>
        </div>
      </div>

      {store.incomeDistributionEnabled ? (
        <div className="space-y-1">
          {incomeDistributionModes.map(([modeKey, mode]) => {
            const payYourselfPercent =
              modeKey === 'custom'
                ? store.allocationPercents.safety + store.allocationPercents.capital
                : mode.allocation.safety + mode.allocation.capital;
            const isSelected = store.incomeDistributionMode === modeKey;

            return (
              <button
                key={modeKey}
                type="button"
                onClick={() => store.setIncomeDistributionMode(modeKey)}
                className={`w-full rounded-[16px] border px-3 py-2 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-500/12 shadow-[0_8px_16px_rgba(16,185,129,0.12)]'
                    : 'border-[var(--mc-border)] bg-[var(--mc-soft)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-black leading-[1.2]">{mode.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {modeKey !== 'custom' ? (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--mc-positive)]">
                        {payYourselfPercent}% {copy.settings.toYou}
                      </span>
                    ) : null}
                    {isSelected ? <span className="text-[10px] opacity-40">✓</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SpendAccountSection({
  isEnglish,
  selectedSpendAccountId,
  setSelectedSpendAccountId,
  selectFieldStyle,
  selectOptionStyle,
  spendableAccounts,
  fmt,
  label,
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] font-semibold opacity-55">
        {label || (isEnglish ? 'Spend from' : 'Списать со счёта')}
      </p>
      <select
        value={selectedSpendAccountId}
        onChange={(event) => setSelectedSpendAccountId(event.target.value)}
        onFocus={scrollFieldIntoView}
        className="w-full rounded-[16px] border px-3.5 py-2.5 text-[13px] font-bold outline-none"
        style={selectFieldStyle}
      >
        <option value="" style={selectOptionStyle}>
          {isEnglish ? 'Choose account' : 'Выбери счёт'}
        </option>
        {spendableAccounts.map((account) => (
          <option key={account.id} value={account.id} style={selectOptionStyle}>
            {account.name} · {fmt(account.balance)}
          </option>
        ))}
      </select>
    </div>
  );
}
