import { DatabaseBackup, Minus, Plus, Sprout, Target } from 'lucide-react';
import FractalTree from '../tree/FractalTree.jsx';
import { ActionButton } from '../ui/AppUi.jsx';

function FocusStrip({ copy, action, nextStepValue, nextStepHint, theme }) {
  return (
    <div
      className="mt-2.5 rounded-[16px] border px-3 py-2.5"
      style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-emerald-500/10 p-1.5 text-[var(--mc-positive)]">
          <Target size={12} />
        </div>
        <p className="text-sm font-semibold opacity-80">{copy.home.mainAction}</p>
      </div>
      <p className="mt-1.5 text-[13px] font-display font-extrabold leading-snug">{action}</p>
      <div
        className="mt-2 flex items-center justify-between gap-3 border-t pt-2 text-sm"
        style={{ borderColor: theme.border }}
      >
        <span className="font-semibold opacity-80">{copy.home.nextStep}</span>
        <span className="text-right font-numbers font-extrabold [overflow-wrap:anywhere]">{nextStepValue}</span>
      </div>
      <p className="mt-0.5 text-right text-sm leading-snug opacity-80">{nextStepHint}</p>
    </div>
  );
}

export default function HomeSection({
  copy,
  store,
  theme,
  fmt,
  onEditBalance,
  primaryStatus,
  hasActiveDebts,
  advisorInsight,
  goalJourney,
  onOpenIncome,
  onOpenExpense,
  showBackupReminder,
  onExportBackup,
}) {
  const requiredExpenses = Array.isArray(store.requiredExpenses) ? store.requiredExpenses : [];
  const allocationPercents = store.allocationPercents || {};
  const insight = advisorInsight || {};
  const savedFirstPercent = 100 - (allocationPercents.balance ?? 0);
  const modeHint = store.incomeDistributionEnabled
    ? `${savedFirstPercent}% ${copy.settings.toYou}`
    : copy.settings.disabled;

  const treeStatus = !store.incomeDistributionEnabled
    ? copy.home.treeStateNoMode
    : requiredExpenses.length === 0
      ? copy.home.treeStateNoRequired
      : hasActiveDebts
        ? copy.home.treeStateDebt
        : goalJourney?.remainingToNext > 0
          ? copy.home.treeStateGrowth
          : copy.home.treeStateStable;

  const actionTitle = insight.action || insight.title || primaryStatus;
  const nextStepValue = goalJourney?.remainingToNext > 0 ? fmt(goalJourney.remainingToNext) : fmt(store.targetCapital);
  const nextStepHint = goalJourney?.remainingToNext > 0 ? copy.home.nextStepHint : copy.home.goalReached;

  return (
    <div className="relative -mx-3 px-4 pb-5 pt-2" style={{ backgroundColor: theme.background }}>
      <div className="relative z-10 -mt-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 basis-full sm:basis-0 flex-1">
            <p className="text-sm font-semibold opacity-80">{copy.home.availableBalance}</p>
            <button
              type="button"
              aria-label={`${copy.home.availableBalance}: ${fmt(store.availableBalance)}`}
              className="mt-1 min-w-0 cursor-pointer text-left text-[clamp(1.5rem,7vw,2.35rem)] font-numbers font-extrabold leading-tight tracking-tighter transition-transform active:scale-95 [overflow-wrap:anywhere]"
              onClick={onEditBalance}
            >
              {fmt(store.availableBalance)}
            </button>
            <div className="mt-1.5 flex items-start gap-1.5 text-sm leading-snug opacity-70">
              <Sprout size={12} className="mt-0.5 shrink-0 text-[var(--mc-positive)]" />
              <span>{treeStatus}</span>
            </div>
          </div>

          <div
            className="max-w-full rounded-2xl border px-3 py-2 text-left"
            style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
          >
            <p className="text-sm font-semibold opacity-80">{copy.home.payYourself}</p>
            <p className="mt-1 text-sm font-black leading-snug">{modeHint}</p>
          </div>
        </div>
      </div>

      <FractalTree
        capital={store.capital}
        target={store.targetCapital}
        theme={theme}
        hasDebt={hasActiveDebts}
        copy={copy}
      />

      <div className="mt-2.5 grid grid-cols-2 gap-3">
        <ActionButton
          label={copy.home.income}
          icon={Plus}
          onClick={onOpenIncome}
          theme={theme}
          color="#22c55e"
          compact
        />
        <ActionButton
          label={copy.home.expense}
          icon={Minus}
          onClick={onOpenExpense}
          theme={theme}
          color="#ef4444"
          compact
        />
      </div>

      <FocusStrip
        copy={copy}
        action={actionTitle}
        nextStepValue={nextStepValue}
        nextStepHint={nextStepHint}
        theme={theme}
      />

      {showBackupReminder && onExportBackup ? (
        <div
          className="mt-2.5 flex items-start gap-2.5 rounded-[16px] border px-3 py-2.5"
          style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
        >
          <div className="rounded-full bg-amber-500/10 p-1.5 text-[var(--mc-warning)]">
            <DatabaseBackup size={12} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug">{copy.home.backupReminderTitle}</p>
            <p className="mt-0.5 text-sm leading-[1.3] opacity-80">{copy.home.backupReminderBody}</p>
            <button
              type="button"
              onClick={onExportBackup}
              className="mt-1.5 rounded-full border px-3 py-1 text-sm font-semibold text-[var(--mc-positive)]"
              style={{ borderColor: theme.border }}
            >
              {copy.home.backupReminderAction}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
