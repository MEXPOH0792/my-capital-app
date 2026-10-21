import { SectionCard, SectionHeader } from '../../ui/AppUi.jsx';

export default function AccountCreationPanel({
  theme,
  text,
  copy,
  softPanelStyle,
  accountForm,
  setAccountForm,
  addCustomAccount,
}) {
  return (
    <SectionCard theme={theme} className="space-y-2 p-3" tone="utility">
      <SectionHeader eyebrow={text.createAccount} compact />
      <input
        type="text"
        value={accountForm.name}
        onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
        placeholder={text.accountPlaceholder}
        className="w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
        style={softPanelStyle}
      />
      <input
        type="text"
        value={accountForm.amount}
        onChange={(e) => setAccountForm((prev) => ({ ...prev, amount: e.target.value }))}
        placeholder={copy.settings.amount}
        className="w-full rounded-[16px] border px-3.5 py-2 text-[0.95rem] font-numbers font-extrabold outline-none"
        style={softPanelStyle}
      />
      <label
        className="flex items-center gap-2.5 rounded-[12px] border px-3.5 py-1.5 text-[10px] font-semibold "
        style={softPanelStyle}
      >
        <input
          type="checkbox"
          checked={accountForm.includeInSpendable}
          onChange={(e) => setAccountForm((prev) => ({ ...prev, includeInSpendable: e.target.checked }))}
          className="accent-emerald-500"
        />
        <span>{text.includeInBalance}</span>
      </label>
      <button
        onClick={addCustomAccount}
        className="w-full rounded-[16px] bg-emerald-600 py-2 text-[10px] font-semibold text-white"
      >
        {text.addAccount}
      </button>
    </SectionCard>
  );
}
