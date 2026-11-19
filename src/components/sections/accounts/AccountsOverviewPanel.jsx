import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Pencil, Trash2, Wallet, X } from 'lucide-react';
import { SectionCard, SectionHeader } from '../../ui/AppUi.jsx';
import { formatMinorAsInput, parseMoneyInputToMinor, sanitizeMoneyInput } from '../../../utils/money.js';

export default function AccountsOverviewPanel({
  theme,
  store,
  text,
  softPanelStyle,
  locale,
  fmt,
  recentTransfers,
  hasMoreTransfers,
  showMoreLabel,
  onShowMoreTransfers,
  reverseTransfer,
  canReverseTransfer,
}) {
  const isEnglish = locale?.startsWith('en');
  const moveUpLabel = isEnglish ? 'Move account up' : 'Поднять счёт выше';
  const moveDownLabel = isEnglish ? 'Move account down' : 'Опустить счёт ниже';
  const renameLabel = isEnglish ? 'Rename account' : 'Переименовать счёт';
  const closeLabel = isEnglish ? 'Close account' : 'Закрыть счёт';
  const [isTransfersOpen, setIsTransfersOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [balanceAccountId, setBalanceAccountId] = useState(null);
  const [draftBalance, setDraftBalance] = useState('');
  const editBalanceLabel = isEnglish ? 'Edit balance' : 'Изменить остаток';
  const numberLocale = isEnglish ? 'en-US' : 'ru-RU';

  const startBalanceEdit = (account) => {
    setEditingAccountId(null);
    setBalanceAccountId(account.id);
    setDraftBalance(formatMinorAsInput(account.balance, numberLocale));
  };

  // An empty field means zero: clearing the field is the natural way to wipe
  // a test amount out of safety, capital or sadaka.
  const saveBalance = (accountId) => {
    store.setAccountBalance(accountId, parseMoneyInputToMinor(draftBalance));
    setBalanceAccountId(null);
  };

  const startRename = (account) => {
    setBalanceAccountId(null);
    setEditingAccountId(account.id);
    setDraftName(account.name);
  };

  const saveRename = (accountId) => {
    const name = draftName.trim();
    if (name) store.updateAccount(accountId, { name });
    setEditingAccountId(null);
  };

  // Closing an account moves any leftover money to the main account, so the
  // confirmation says so outright instead of implying the balance disappears.
  const confirmClose = (account) => {
    const question = account.balance
      ? isEnglish
        ? `Close "${account.name}"? The remaining ${fmt(account.balance)} moves to the main account.`
        : `Закрыть счёт «${account.name}»? Остаток ${fmt(account.balance)} перейдёт на основной счёт.`
      : isEnglish
        ? `Close "${account.name}"?`
        : `Закрыть счёт «${account.name}»?`;

    if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(question)) return;
    store.deleteAccount(account.id);
  };

  return (
    <SectionCard theme={theme} className="space-y-2 p-3" tone="utility">
      <SectionHeader eyebrow={text.accounts} title={text.balancesByAccount} compact />

      <div className="space-y-1.5">
        {store.accounts.map((account, index) => (
          <div key={account.id} className="rounded-[16px] border px-3 py-1.5" style={softPanelStyle}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {editingAccountId === account.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveRename(account.id);
                        if (event.key === 'Escape') setEditingAccountId(null);
                      }}
                      aria-label={renameLabel}
                      autoFocus
                      className="min-w-0 flex-1 rounded-[12px] border px-2 py-1 text-[12px] font-bold outline-none"
                      style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                    />
                    <button
                      type="button"
                      onClick={() => saveRename(account.id)}
                      aria-label={isEnglish ? 'Save name' : 'Сохранить название'}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[var(--mc-positive)]"
                      style={{ borderColor: theme.border }}
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAccountId(null)}
                      aria-label={isEnglish ? 'Cancel' : 'Отмена'}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border opacity-55"
                      style={{ borderColor: theme.border }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[12px] font-bold">{account.name}</p>
                    {account.isPrimary ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--mc-positive)]">
                        {text.main}
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {!account.isPrimary && account.includeInSpendable ? (
                    <button
                      type="button"
                      onClick={() => store.setPrimaryAccount(account.id)}
                      className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-[var(--mc-positive)] transition-all"
                      style={{ borderColor: theme.border }}
                    >
                      {text.makeMain}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => store.moveAccountPriority(account.id, 'up')}
                    disabled={index === 0}
                    aria-label={moveUpLabel}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[var(--mc-positive)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderColor: theme.border }}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => store.moveAccountPriority(account.id, 'down')}
                    disabled={index === store.accounts.length - 1}
                    aria-label={moveDownLabel}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[var(--mc-positive)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderColor: theme.border }}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startBalanceEdit(account)}
                    aria-label={`${editBalanceLabel}: ${account.name}`}
                    title={editBalanceLabel}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border opacity-55 transition-opacity hover:opacity-100"
                    style={{ borderColor: theme.border }}
                  >
                    <Wallet size={12} />
                  </button>
                  {/* System accounts are renamed through the storage setup screen
                      and must not be removed — they hold capital and safety. */}
                  {!account.isSystem ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startRename(account)}
                        aria-label={renameLabel}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border opacity-55 transition-opacity hover:opacity-100"
                        style={{ borderColor: theme.border }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmClose(account)}
                        aria-label={closeLabel}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[var(--mc-negative)] opacity-70 transition-opacity hover:opacity-100"
                        style={{ borderColor: theme.border }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 max-w-[42%] text-right text-[12px] font-numbers font-black [overflow-wrap:anywhere]">
                {fmt(account.balance)}
              </span>
            </div>
            {balanceAccountId === account.id ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftBalance}
                  placeholder="0"
                  onChange={(event) => setDraftBalance(sanitizeMoneyInput(event.target.value, numberLocale))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveBalance(account.id);
                    if (event.key === 'Escape') setBalanceAccountId(null);
                  }}
                  aria-label={`${editBalanceLabel}: ${account.name}`}
                  autoFocus
                  className="min-w-0 flex-1 rounded-[12px] border px-2 py-1 text-right text-[12px] font-numbers font-bold outline-none"
                  style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                />
                <button
                  type="button"
                  onClick={() => saveBalance(account.id)}
                  aria-label={isEnglish ? 'Save balance' : 'Сохранить остаток'}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[var(--mc-positive)]"
                  style={{ borderColor: theme.border }}
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceAccountId(null)}
                  aria-label={isEnglish ? 'Cancel' : 'Отмена'}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border opacity-55"
                  style={{ borderColor: theme.border }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-[16px] border px-3 py-2" style={softPanelStyle}>
        <button
          type="button"
          onClick={() => setIsTransfersOpen((value) => !value)}
          aria-expanded={isTransfersOpen}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-[10px] font-semibold opacity-55">{text.recentTransfers}</span>
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-black opacity-55">{recentTransfers.length}</span>
            <ChevronDown size={14} className={`shrink-0 transition-transform ${isTransfersOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {isTransfersOpen ? (
          <div className="mt-2 space-y-1.5">
            {recentTransfers.length === 0 ? (
              <div
                className="rounded-[12px] border px-3 py-2 text-[11px] leading-[1.35] opacity-55"
                style={{ borderColor: theme.border }}
              >
                {text.noTransfers}
              </div>
            ) : (
              recentTransfers.map((item) => (
                <div key={`recent-${item.id}`} className="rounded-[16px] border px-3 py-2" style={softPanelStyle}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold">{item.category}</p>
                      <p className="mt-0.5 text-[10px] font-semibold opacity-40">
                        {new Date(item.date).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <span className="shrink-0 max-w-[42%] text-right text-[12px] font-numbers font-black text-[var(--mc-positive)] [overflow-wrap:anywhere]">
                      {'<->'}
                      {fmt(item.amount)}
                    </span>
                  </div>
                  {item.meta?.fromAccountId && item.meta?.toAccountId ? (
                    <div className="mt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => reverseTransfer(item.id)}
                        disabled={!canReverseTransfer(item)}
                        className="rounded-full border px-3 py-1 text-[10px] font-semibold text-[var(--mc-positive)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ borderColor: theme.border }}
                      >
                        {text.reverse}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
            {hasMoreTransfers ? (
              <button
                type="button"
                onClick={onShowMoreTransfers}
                className="w-full rounded-[16px] border px-4 py-2 text-[10px] font-semibold transition-all"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}
              >
                {showMoreLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
