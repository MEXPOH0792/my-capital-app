import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { SectionCard, SectionHeader } from '../../ui/AppUi.jsx';

function AccountSelect({ theme, label, placeholder, value, options, onChange, selectFieldStyle, selectOptionStyle }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = options.find((item) => item.value === value) || null;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="space-y-2">
      <p className="px-1 text-[10px] font-semibold opacity-55">{label}</p>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-[16px] border px-3 py-2 text-left text-[13px] font-bold outline-none"
          style={{
            ...selectFieldStyle,
            color: selectedOption ? theme.textPrimary : theme.textSecondary,
            WebkitTextFillColor: selectedOption ? theme.textPrimary : theme.textSecondary,
          }}
          aria-expanded={open}
        >
          <span className="min-w-0 truncate">{selectedOption?.label || placeholder}</span>
          <ChevronDown size={16} className={`shrink-0 opacity-55 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[16px] border shadow-2xl"
            style={selectOptionStyle}
          >
            <div className="max-h-56 overflow-y-auto p-1.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-[12px] px-3 py-1.5 text-left text-[13px] font-bold transition-all ${
                      isSelected ? 'bg-emerald-500/12 text-[var(--mc-positive)]' : 'opacity-70'
                    }`}
                    style={{ color: isSelected ? undefined : theme.textPrimary }}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected ? <Check size={14} className="shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TransferPanel({
  theme,
  store,
  text,
  copy,
  softPanelStyle,
  selectFieldStyle,
  selectOptionStyle,
  fmt,
  formatInput,
  transferForm,
  setTransferForm,
  submitTransfer,
  canSubmitTransfer,
  transferAmountValue,
  fromTransferAccount,
  toTransferAccount,
}) {
  const orderedAccounts = [...store.accounts].sort((a, b) => {
    if (a.isPrimary === b.isPrimary) return 0;
    return a.isPrimary ? -1 : 1;
  });

  const fromOptions = orderedAccounts.map((account) => ({
    value: account.id,
    label: `${account.name} · ${fmt(account.balance)}`,
  }));

  const toOptions = orderedAccounts
    .filter((account) => account.id !== transferForm.fromId)
    .map((account) => ({
      value: account.id,
      label: `${account.name} · ${fmt(account.balance)}`,
    }));

  return (
    <SectionCard theme={theme} className="space-y-2 overflow-visible p-3" tone="utility">
      <SectionHeader eyebrow={text.transferBetweenAccounts} compact />

      <AccountSelect
        theme={theme}
        label={text.fromAccount}
        placeholder={text.chooseSource}
        value={transferForm.fromId}
        options={fromOptions}
        onChange={(value) => setTransferForm((prev) => ({ ...prev, fromId: value }))}
        selectFieldStyle={selectFieldStyle}
        selectOptionStyle={selectOptionStyle}
      />

      <AccountSelect
        theme={theme}
        label={text.toAccount}
        placeholder={text.chooseDestination}
        value={transferForm.toId}
        options={toOptions}
        onChange={(value) => setTransferForm((prev) => ({ ...prev, toId: value }))}
        selectFieldStyle={selectFieldStyle}
        selectOptionStyle={selectOptionStyle}
      />

      <div className="space-y-2">
        <p className="px-1 text-[10px] font-semibold opacity-55">{copy.settings.amount}</p>
        <input
          type="text"
          value={transferForm.amount}
          onChange={(e) => setTransferForm((prev) => ({ ...prev, amount: formatInput(e.target.value) }))}
          placeholder={copy.settings.amount}
          className="w-full rounded-[16px] border px-3.5 py-2 text-[0.95rem] font-numbers font-extrabold outline-none"
          style={softPanelStyle}
        />

        {fromTransferAccount && toTransferAccount ? (
          <div
            className="rounded-[12px] border px-3 py-1.5 text-[11px] leading-[1.35] opacity-70"
            style={softPanelStyle}
          >
            <span className="font-semibold">{fromTransferAccount.name}</span>
            <span className="opacity-55"> → </span>
            <span className="font-semibold">{toTransferAccount.name}</span>
            {transferAmountValue > 0 ? (
              <span className="ml-2 font-numbers font-black text-[var(--mc-positive)]">{fmt(transferAmountValue)}</span>
            ) : null}
          </div>
        ) : null}

        <button
          onClick={submitTransfer}
          disabled={!canSubmitTransfer}
          className="w-full rounded-[16px] bg-emerald-600 py-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {text.move}
        </button>
      </div>
    </SectionCard>
  );
}
