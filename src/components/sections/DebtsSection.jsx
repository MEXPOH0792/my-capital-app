import { Plus } from 'lucide-react';
import { DebtCard, DebtStrategyCard, EmptyState, SummaryCard } from '../ui/AppUi.jsx';

export default function DebtsSection({
  copy,
  theme,
  fmt,
  isEnglish,
  debtStrategies,
  uncoveredRequired,
  safeDebtPaymentNow,
  suggestedDebtPayment,
  onUseSuggestedPayment,
  store,
  sortedDebts,
  onOpenNewDebt,
  onEditDebt,
  onPayDebt,
}) {
  const liabilityTotal = fmt(
    store.debts
      .filter((item) => item.type === 'LIABILITY' && item.status === 'ACTIVE')
      .reduce((sum, item) => sum + item.currentBalance, 0),
  );

  const assetTotal = fmt(
    store.debts
      .filter((item) => item.type === 'ASSET' && item.status === 'ACTIVE')
      .reduce((sum, item) => sum + item.currentBalance, 0),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[clamp(1.55rem,6vw,1.9rem)] font-display font-extrabold tracking-tight leading-[0.98]">
          {copy.debts.title}
        </h2>
        <button
          type="button"
          onClick={onOpenNewDebt}
          className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <SummaryCard label={copy.debts.iOwe} value={liabilityTotal} color="#ef4444" theme={theme} compact />
        <SummaryCard label={copy.debts.owedToMe} value={assetTotal} color="#22c55e" theme={theme} compact />
      </div>

      {debtStrategies.recommendedDebt ? (
        <DebtStrategyCard
          copy={copy}
          theme={theme}
          fmt={fmt}
          isEnglish={isEnglish}
          strategies={debtStrategies}
          uncoveredRequired={uncoveredRequired}
          safeDebtPaymentNow={safeDebtPaymentNow}
          suggestedDebtPayment={suggestedDebtPayment}
          onUseSuggestedPayment={onUseSuggestedPayment}
        />
      ) : null}

      <div className="space-y-1.5">
        {sortedDebts.length === 0 ? (
          <EmptyState
            text={copy.debts.empty}
            hint={isEnglish ? 'Add a debt or receivable.' : 'Добавь долг или сумму, которую должны тебе.'}
          />
        ) : (
          sortedDebts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              theme={theme}
              copy={copy}
              fmt={fmt}
              isEnglish={isEnglish}
              isTopPriority={debt.id === debtStrategies.recommendedDebt?.id}
              isAvalanche={debt.id === debtStrategies.avalancheDebt?.id}
              isSnowball={debt.id === debtStrategies.snowballDebt?.id}
              onEdit={() => onEditDebt(debt)}
              onPay={() => onPayDebt(debt)}
            />
          ))
        )}
      </div>
    </div>
  );
}
