import { Trash2 } from 'lucide-react';
import { MetricCard, SectionCard, SectionHeader } from '../../ui/AppUi.jsx';

export default function ObligationsPanel({ copy, store, theme, softPanelStyle, text, obligations, fmt, formatInput }) {
  const { requiredExpenseForm, setRequiredExpenseForm, addRequiredExpenseItem } = obligations;
  const totalRequiredExpenses = store.requiredExpenses.reduce((sum, item) => sum + item.amount, 0);
  const hasItems = store.requiredExpenses.length > 0;

  return (
    <div className="space-y-3">
      <SectionCard theme={theme} className="space-y-2 p-3" tone="utility">
        <SectionHeader eyebrow={copy.settings.requiredMonthlyExpenses} title={text.obligationsTitle} compact />

        <div className="grid grid-cols-2 gap-2">
          <MetricCard label={copy.settings.totalRequired} value={fmt(totalRequiredExpenses)} theme={theme} compact />
          <MetricCard label={text.obligationsItems} value={store.requiredExpenses.length} theme={theme} compact />
        </div>

        <input
          type="text"
          value={requiredExpenseForm.title}
          onChange={(event) => setRequiredExpenseForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder={copy.settings.expensePlaceholder}
          className="w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
          style={softPanelStyle}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <input
            type="text"
            value={requiredExpenseForm.amount}
            onChange={(event) =>
              setRequiredExpenseForm((prev) => ({ ...prev, amount: formatInput(event.target.value) }))
            }
            placeholder={copy.settings.amount}
            className="w-full rounded-[16px] border px-3.5 py-2 text-[0.95rem] font-numbers font-extrabold outline-none"
            style={softPanelStyle}
          />
          <button
            type="button"
            onClick={addRequiredExpenseItem}
            className="w-full rounded-[16px] bg-emerald-600 px-4 py-2 text-center text-[10px] font-semibold text-white sm:w-auto"
          >
            {copy.settings.add}
          </button>
        </div>

        <div className="space-y-2">
          {!hasItems ? (
            <div className="py-4 text-center text-[10px] font-semibold opacity-40">{copy.settings.emptyList}</div>
          ) : (
            store.requiredExpenses.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2"
                style={softPanelStyle}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{item.title}</p>
                  <p className="mt-0.5 text-[10px] font-semibold opacity-40">{copy.settings.requiredPayment}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-[12px] font-numbers font-black">{fmt(item.amount)}</span>
                  <button
                    type="button"
                    onClick={() => store.removeRequiredExpense(item.id)}
                    className="text-[var(--mc-negative)] opacity-70 hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
