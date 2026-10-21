import { memo } from 'react';
import { ArrowRightLeft, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { isReversibleTransferTransaction } from '../../domain/history.js';
import { EmptyState } from '../ui/AppUi.jsx';
import { useWindowedHistoryList } from '../../hooks/history/useWindowedHistoryList.js';
import { useSwipeAction } from '../../hooks/useSwipeAction.js';
import { hapticMedium } from '../../utils/haptics.js';

const HistoryRow = memo(function HistoryRow({
  item,
  isEnglish,
  locale,
  fmt,
  theme,
  canEdit,
  canDelete,
  canReverse,
  onOpen,
  onDelete,
  onReverse,
}) {
  const accountLabel = isEnglish ? 'Account' : 'Счёт';
  const deleteLabel = isEnglish ? 'Delete' : 'Удалить';
  const reverseLabel = isEnglish ? 'Undo' : 'Откатить';
  const amountPrefix = item.type === 'income' ? '+' : item.type === 'expense' ? '-' : '→';
  const isIncome = item.type === 'income';
  const isTransfer = item.type === 'transfer';

  const primaryAction = canReverse
    ? { kind: 'reverse', label: reverseLabel, run: () => onReverse?.(item) }
    : canDelete
      ? { kind: 'delete', label: deleteLabel, run: () => onDelete?.(item) }
      : null;

  const swipe = useSwipeAction({
    enabled: Boolean(primaryAction),
    peekThreshold: 72,
    commitThreshold: 140,
    onCommit: () => {
      hapticMedium();
      primaryAction?.run();
    },
    onPeek: () => {
      hapticMedium();
    },
  });

  const handleClick = (event) => {
    if (swipe.wasSwiped() || swipe.isOpen) {
      event.preventDefault();
      event.stopPropagation();
      swipe.reset();
      return;
    }
    onOpen(item);
  };

  const actionColor = primaryAction?.kind === 'reverse' ? '#42B741' : '#ef4444';

  return (
    <div className="relative overflow-hidden rounded-[12px]" {...swipe.bind}>
      {primaryAction ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end pr-3"
          style={{ backgroundColor: `${actionColor}22`, color: actionColor }}
          aria-hidden="true"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold ">
            {primaryAction.kind === 'reverse' ? <RotateCcw size={12} /> : <Trash2 size={12} />}
            <span>{primaryAction.label}</span>
          </div>
        </div>
      ) : null}
      <div
        className="relative rounded-[12px] border px-2.5 py-1.5"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          transform: `translateX(${swipe.offset}px)`,
          transition: swipe.offset === 0 || swipe.isOpen ? 'transform 180ms ease-out' : 'none',
          touchAction: 'pan-y',
        }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              isIncome
                ? 'bg-green-500/10 text-[var(--mc-positive)]'
                : isTransfer
                  ? 'bg-emerald-500/10 text-[var(--mc-positive)]'
                  : 'bg-red-500/10 text-[var(--mc-negative)]'
            }`}
          >
            {isIncome ? <Plus size={11} /> : isTransfer ? <ArrowRightLeft size={11} /> : <Minus size={11} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[10px] font-bold leading-tight">{item.category}</p>
              <span
                className={`shrink-0 max-w-[42%] text-right text-[10px] font-black leading-tight [overflow-wrap:anywhere] ${
                  isIncome ? 'text-[var(--mc-positive)]' : isTransfer ? 'text-[var(--mc-positive)]' : ''
                }`}
              >
                {amountPrefix}
                {fmt(item.amount)}
              </span>
            </div>

            <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[10px] leading-tight opacity-55">
                {new Date(item.date).toLocaleDateString(locale)}
                {item.meta?.accountName && !isTransfer ? ` · ${accountLabel}: ${item.meta.accountName}` : ''}
                {item.meta?.fromAccountName && item.meta?.toAccountName
                  ? ` · ${item.meta.fromAccountName} → ${item.meta.toAccountName}`
                  : ''}
              </p>

              <div className="flex shrink-0 items-center gap-1">
                {canEdit || canReverse ? (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold opacity-55"
                    style={{ borderColor: theme.border }}
                  >
                    {canEdit ? (isEnglish ? 'Edit' : 'Изм.') : isEnglish ? 'Open' : 'Открыть'}
                  </span>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(item);
                    }}
                    aria-label={deleteLabel}
                    title={deleteLabel}
                    className="flex h-5 w-5 items-center justify-center rounded-full border text-[var(--mc-negative)]"
                    style={{ borderColor: theme.border }}
                  >
                    <Trash2 size={10} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function HistorySection({
  copy,
  isEnglish,
  historyFilterItems,
  historyFilter,
  setHistoryFilter,
  historyQuery,
  setHistoryQuery,
  softPanelStyle,
  filteredHistory,
  theme,
  locale,
  fmt,
  canEditTransaction,
  canDeleteTransaction,
  deleteTransaction,
  reverseTransfer,
  canReverseTransfer,
  onOpenTransaction,
}) {
  const {
    listRef,
    visibleHistory,
    hasMoreHistory,
    windowedHistory,
    topSpacerHeight,
    bottomSpacerHeight,
    deletableIds,
    showMoreHistory,
  } = useWindowedHistoryList({
    filteredHistory,
    historyFilter,
    historyQuery,
    canDeleteTransaction,
  });

  const searchPlaceholder = isEnglish ? 'Search category or transfer' : 'Поиск по категории или переводу';
  const shownEntriesText = isEnglish
    ? `${visibleHistory.length} of ${filteredHistory.length} entries`
    : `${visibleHistory.length} из ${filteredHistory.length} операций`;
  const emptyHint = isEnglish
    ? 'Change filters or add income, expense or transfer entries.'
    : 'Смени фильтры или добавь доходы, расходы или переводы.';
  const showMoreLabel = isEnglish ? 'Show more' : 'Показать ещё';

  return (
    <div className="space-y-1.5">
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold opacity-55">{copy.nav.history}</p>
        <h2 className="text-[clamp(1.22rem,4.7vw,1.45rem)] font-display font-extrabold leading-none">
          {copy.history.title}
        </h2>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap gap-1">
          {historyFilterItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setHistoryFilter(item.key)}
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-all ${
                historyFilter === item.key
                  ? 'border-emerald-500 bg-emerald-500/12 text-[var(--mc-positive)]'
                  : 'border-transparent bg-[var(--mc-soft)] opacity-70'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
          <input
            type="text"
            value={historyQuery}
            onChange={(event) => setHistoryQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-full rounded-[12px] border px-3 text-[11px] font-bold outline-none"
            style={softPanelStyle}
          />
          <div
            className="rounded-[12px] border px-2.5 py-1.5 text-[10px] font-black leading-none opacity-70"
            style={softPanelStyle}
          >
            {shownEntriesText}
          </div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <EmptyState text={copy.history.empty} hint={emptyHint} />
      ) : (
        <div ref={listRef} className="space-y-1">
          {topSpacerHeight > 0 ? <div style={{ height: topSpacerHeight }} aria-hidden="true" /> : null}
          {windowedHistory.map((item) => (
            <HistoryRow
              key={item.id}
              item={item}
              isEnglish={isEnglish}
              locale={locale}
              fmt={fmt}
              theme={theme}
              canEdit={canEditTransaction?.(item)}
              canDelete={deletableIds.has(item.id)}
              canReverse={isReversibleTransferTransaction(item) && canReverseTransfer?.(item)}
              onOpen={onOpenTransaction || (() => {})}
              onDelete={deleteTransaction}
              onReverse={reverseTransfer ? (transaction) => reverseTransfer(transaction.id) : undefined}
            />
          ))}
          {bottomSpacerHeight > 0 ? <div style={{ height: bottomSpacerHeight }} aria-hidden="true" /> : null}
        </div>
      )}

      {hasMoreHistory ? (
        <button
          type="button"
          onClick={showMoreHistory}
          className="h-8 w-full rounded-[12px] border px-4 text-[10px] font-semibold transition-all"
          style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        >
          {showMoreLabel}
        </button>
      ) : null}
    </div>
  );
}

export default memo(HistorySection);
