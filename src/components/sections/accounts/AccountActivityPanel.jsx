import { useMemo } from 'react';
import { SectionCard } from '../../ui/AppUi.jsx';

export default function AccountActivityPanel({
  theme,
  text,
  softPanelStyle,
  locale,
  fmt,
  store,
  selectedAccount,
  setSelectedAccountActivityId,
  visibleAccountActivity,
  hasMoreActivity,
  showMoreLabel,
  onShowMoreActivity,
  canDeleteTransaction,
  deleteTransaction,
  reverseTransfer,
  canReverseTransfer,
}) {
  const accountButtons = useMemo(
    () =>
      store.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        active: selectedAccount?.id === account.id,
      })),
    [store.accounts, selectedAccount?.id],
  );

  const deletableIds = useMemo(
    () => new Set(visibleAccountActivity.filter((item) => canDeleteTransaction(item)).map((item) => item.id)),
    [visibleAccountActivity, canDeleteTransaction],
  );

  return (
    <SectionCard theme={theme} className="space-y-2 p-3" tone="utility">
      <div className="flex items-center justify-between gap-3">
        <p className="px-1 text-[10px] font-semibold opacity-55">{text.activityByAccount}</p>
        {selectedAccount ? (
          <span className="truncate text-[10px] font-semibold text-[var(--mc-positive)]">{selectedAccount.name}</span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        {accountButtons.map((account) => (
          <button
            key={`activity-${account.id}`}
            onClick={() => setSelectedAccountActivityId(account.id)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
              account.active
                ? 'border-emerald-500 bg-emerald-500/12 text-[var(--mc-positive)] shadow-[0_0_0_1px_rgba(16,185,129,0.08)]'
                : 'border-transparent bg-[var(--mc-soft)] opacity-70'
            }`}
          >
            {account.name}
          </button>
        ))}
      </div>

      {visibleAccountActivity.length === 0 ? (
        <div className="rounded-[16px] border px-3 py-2 text-[11px] leading-[1.35] opacity-55" style={softPanelStyle}>
          {text.noMovements}
        </div>
      ) : (
        visibleAccountActivity.map((item) => {
          const isOutgoingTransfer = item.type === 'transfer' && item.meta?.fromAccountId === selectedAccount?.id;
          const isIncomingTransfer = item.type === 'transfer' && item.meta?.toAccountId === selectedAccount?.id;
          const toneClass =
            item.type === 'transfer'
              ? isOutgoingTransfer
                ? 'text-[var(--mc-warning)]'
                : 'text-[var(--mc-positive)]'
              : item.type === 'income'
                ? 'text-[var(--mc-positive)]'
                : 'text-[var(--mc-negative)]';
          const badgeTone =
            item.type === 'transfer'
              ? 'bg-emerald-500/10'
              : item.type === 'income'
                ? 'bg-green-500/10'
                : 'bg-red-500/10';
          const badgeText =
            item.type === 'transfer'
              ? isOutgoingTransfer
                ? text.out
                : isIncomingTransfer
                  ? text.in
                  : text.transfer
              : item.type === 'income'
                ? text.income
                : text.expense;

          return (
            <div key={`activity-row-${item.id}`} className="rounded-[16px] border px-3 py-1.5" style={softPanelStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[12px] font-bold">{item.category}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass} ${badgeTone}`}>
                      {badgeText}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-semibold opacity-40">
                    {new Date(item.date).toLocaleDateString(locale)}
                  </p>
                  {item.type === 'transfer' ? (
                    <p className="mt-0.5 text-[10px] leading-[1.35] opacity-55">
                      {item.meta?.fromAccountName && item.meta?.toAccountName
                        ? `${item.meta.fromAccountName} → ${item.meta.toAccountName}`
                        : item.category}
                    </p>
                  ) : null}
                  {item.meta?.accountName && item.type !== 'transfer' ? (
                    <p className="mt-0.5 text-[10px] leading-[1.35] opacity-55">
                      {text.sourceAccount}: {item.meta.accountName}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 max-w-[42%] text-right text-[12px] font-numbers font-black [overflow-wrap:anywhere] ${toneClass}`}
                >
                  {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : isIncomingTransfer ? '+' : '-'}
                  {fmt(item.amount)}
                </span>
              </div>
              {deletableIds.has(item.id) ||
              (item.type === 'transfer' && item.meta?.fromAccountId && item.meta?.toAccountId) ? (
                <div className="mt-1 flex flex-wrap justify-end gap-1">
                  {item.type === 'transfer' && item.meta?.fromAccountId && item.meta?.toAccountId ? (
                    <button
                      onClick={() => reverseTransfer(item.id)}
                      disabled={!canReverseTransfer(item)}
                      className="rounded-full border px-3 py-1 text-[10px] font-semibold text-[var(--mc-positive)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ borderColor: theme.border }}
                    >
                      {text.reverse}
                    </button>
                  ) : null}
                  {deletableIds.has(item.id) ? (
                    <button
                      onClick={() => deleteTransaction(item)}
                      className="rounded-full border px-3 py-1 text-[10px] font-semibold text-[var(--mc-negative)] transition-all"
                      style={{ borderColor: theme.border }}
                    >
                      {text.delete}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })
      )}

      {hasMoreActivity ? (
        <button
          onClick={onShowMoreActivity}
          className="w-full rounded-[16px] border px-4 py-2 text-[10px] font-semibold transition-all"
          style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        >
          {showMoreLabel}
        </button>
      ) : null}
    </SectionCard>
  );
}
