import { ArrowUpRight, Building2, Percent } from 'lucide-react';

export function DebtStrategyCard({
  theme,
  fmt,
  isEnglish,
  strategies,
  uncoveredRequired,
  safeDebtPaymentNow,
  suggestedDebtPayment,
  onUseSuggestedPayment,
}) {
  const { recommendedDebt, avalancheDebt, snowballDebt, recommendationType } = strategies;
  if (!recommendedDebt) return null;

  const recommendationTitle =
    recommendationType === 'avalanche'
      ? isEnglish
        ? 'Priority now: expensive debt'
        : 'Приоритет сейчас: дорогой долг'
      : recommendationType === 'single'
        ? isEnglish
          ? 'Priority now: finish the only debt'
          : 'Приоритет сейчас: закрыть единственный долг'
        : isEnglish
          ? 'Priority now: close the smallest debt'
          : 'Приоритет сейчас: закрыть самый маленький долг';

  const recommendationSummary =
    recommendationType === 'avalanche'
      ? isEnglish
        ? `${recommendedDebt.title} has the highest rate: ${recommendedDebt.interestRate}%`
        : `${recommendedDebt.title} имеет самую высокую ставку: ${recommendedDebt.interestRate}%`
      : recommendationType === 'single'
        ? isEnglish
          ? `${recommendedDebt.title} is the last active debt.`
          : `${recommendedDebt.title} — последний активный долг.`
        : isEnglish
          ? `${recommendedDebt.title} is the quickest win: ${fmt(recommendedDebt.currentBalance)} left`
          : `${recommendedDebt.title} — самая быстрая победа: осталось ${fmt(recommendedDebt.currentBalance)}`;

  const uncoveredSummary =
    uncoveredRequired > 0
      ? isEnglish
        ? `${fmt(uncoveredRequired)} of essential monthly bills is still uncovered.`
        : `Обязательных расходов ещё не закрыто на ${fmt(uncoveredRequired)}.`
      : isEnglish
        ? 'Essential monthly bills are already covered.'
        : 'Обязательные расходы месяца уже закрыты.';

  const safePaymentLabel = isEnglish ? 'Safe payment now' : 'Безопасный платёж сейчас';
  const usePaymentLabel = isEnglish ? `Use ${fmt(suggestedDebtPayment)}` : `Внести ${fmt(suggestedDebtPayment)}`;

  return (
    <div
      className="min-w-0 w-full space-y-1.5 rounded-[22px] border p-3"
      style={{ backgroundColor: theme.surface, borderColor: theme.border, boxShadow: theme.panelShadow }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--mc-positive)]">
            {isEnglish ? 'Debt strategy' : 'Стратегия долга'}
          </p>
          <h3 className="mt-1 text-[0.82rem] font-display font-extrabold leading-[1.08]">{recommendationTitle}</h3>
        </div>
        <div
          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold text-[var(--mc-negative)]"
          style={{ borderColor: theme.border }}
        >
          {fmt(recommendedDebt.currentBalance)}
        </div>
      </div>

      <div
        className="rounded-[12px] border px-2.5 py-1.5 text-[10px] leading-[1.28]"
        style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
      >
        <p className="font-bold">{recommendationSummary}</p>
        <p className="mt-0.5 opacity-70">{uncoveredSummary}</p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div
          className="rounded-[12px] border px-2.5 py-1.5"
          style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
        >
          <p className="text-[10px] font-semibold opacity-55">Avalanche</p>
          <p className="mt-0.5 text-[10px] font-bold leading-[1.2] text-[var(--mc-negative)]">
            {avalancheDebt ? `${avalancheDebt.title} · ${avalancheDebt.interestRate || 0}%` : '—'}
          </p>
        </div>
        <div
          className="rounded-[12px] border px-2.5 py-1.5"
          style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
        >
          <p className="text-[10px] font-semibold opacity-55">Snowball</p>
          <p className="mt-0.5 text-[10px] font-bold leading-[1.2] text-[var(--mc-positive)]">
            {snowballDebt ? `${snowballDebt.title} · ${fmt(snowballDebt.currentBalance)}` : '—'}
          </p>
        </div>
      </div>

      <div
        className="rounded-[12px] border px-2.5 py-1.5 text-[10px] leading-[1.28]"
        style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
      >
        <p className="font-bold">
          {safePaymentLabel}: {fmt(safeDebtPaymentNow)}
        </p>
      </div>

      <button
        type="button"
        onClick={onUseSuggestedPayment}
        disabled={suggestedDebtPayment <= 0}
        className="w-full rounded-[12px] bg-emerald-600 py-1.5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.16)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {usePaymentLabel}
      </button>
    </div>
  );
}

export function DebtCard({ debt, theme, onEdit, onPay, isTopPriority, isAvalanche, isSnowball, copy, fmt, isEnglish }) {
  const isLiability = debt.type === 'LIABILITY';
  const progress =
    debt.initialBalance > 0 ? ((debt.initialBalance - debt.currentBalance) / debt.initialBalance) * 100 : 0;

  return (
    <div
      className={`group min-w-0 w-full rounded-[22px] border p-3 transition-all ${isTopPriority ? 'ring-2 ring-red-500/20' : ''}`}
      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <div
              className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold ${isLiability ? 'border-red-500/20 bg-red-500/10 text-[var(--mc-negative)]' : 'border-green-500/20 bg-green-500/10 text-[var(--mc-positive)]'}`}
            >
              {isLiability ? copy.debts.liability : copy.debts.asset}
            </div>
            {isTopPriority ? (
              <div className="flex items-center gap-1 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(239,68,68,0.16)]">
                <ArrowUpRight size={8} /> {copy.debts.payoffPriority}
              </div>
            ) : null}
            {isLiability && isAvalanche ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--mc-warning)]">
                {isEnglish ? 'Highest rate' : 'Макс. ставка'}
              </div>
            ) : null}
            {isLiability && isSnowball ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--mc-positive)]">
                {isEnglish ? 'Quick close' : 'Быстро закрыть'}
              </div>
            ) : null}
          </div>

          <h4 className="truncate text-[11px] font-display font-extrabold tracking-tight md:text-[12px]">
            {debt.title}
          </h4>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 opacity-40">
            <div className="flex items-center gap-1">
              <Building2 size={9} />
              <span className="text-[10px] font-semibold ">{debt.bankName || copy.debts.privatePerson}</span>
            </div>
            {debt.interestRate > 0 ? (
              <div className="flex items-center gap-1 text-[var(--mc-negative)]">
                <Percent size={9} />
                <span className="text-[10px] font-semibold ">
                  {debt.interestRate}% {copy.debts.rate}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 max-w-[48%] text-right">
          <p className="mb-0.5 text-[10px] font-semibold opacity-40">{copy.debts.balanceLeft}</p>
          <p className="font-numbers text-[12px] font-extrabold [overflow-wrap:anywhere] md:text-[14px]">
            {fmt(debt.currentBalance)}
          </p>
        </div>
      </div>

      <div className="mb-1.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: theme.surfaceSoft }}>
        <div
          className={`mc-bar h-full ${isLiability ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="w-full rounded-[12px] border py-1.5 text-[10px] font-semibold transition-all active:scale-95"
          style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}
        >
          {copy.debts.edit || (isEnglish ? 'Edit debt' : 'Редактировать')}
        </button>
        <button
          type="button"
          onClick={onPay}
          className={`w-full rounded-[12px] py-1.5 text-[10px] font-semibold transition-all active:scale-95 ${
            isLiability
              ? 'bg-red-500/10 text-[var(--mc-negative)] hover:bg-red-500/20'
              : 'bg-green-500 text-white shadow-[0_8px_18px_rgba(34,197,94,0.16)]'
          }`}
        >
          {copy.debts.payment}
        </button>
      </div>
    </div>
  );
}
