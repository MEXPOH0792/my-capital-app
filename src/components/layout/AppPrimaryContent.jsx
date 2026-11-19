import { Suspense, lazy } from 'react';

const loadHomeSection = () => import('../sections/HomeSection.jsx');
const loadDebtsSection = () => import('../sections/DebtsSection.jsx');
const loadAnalyticsSection = () => import('../sections/AnalyticsSection.jsx');
const loadHistorySection = () => import('../sections/HistorySection.jsx');

const HomeSection = lazy(loadHomeSection);
const DebtsSection = lazy(loadDebtsSection);
const AnalyticsSection = lazy(loadAnalyticsSection);
const HistorySection = lazy(loadHistorySection);

export function preloadPrimarySections() {
  return [loadHomeSection, loadDebtsSection, loadAnalyticsSection, loadHistorySection].reduce(
    (queue, loadChunk) => queue.then(() => loadChunk().catch(() => {})),
    Promise.resolve(),
  );
}

function ScreenFallback() {
  return (
    <div className="min-h-[10rem] rounded-[22px] border border-[var(--mc-border-soft)] bg-[var(--mc-soft-faint)]" />
  );
}

export default function AppPrimaryContent({ activeTab, shell, home, debts, analytics, history }) {
  const { copy, theme, panelStyle, softPanelStyle } = shell;

  if (activeTab === 'home') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <HomeSection
          copy={copy}
          store={home.store}
          panelStyle={panelStyle}
          theme={theme}
          fmt={home.fmt}
          onEditBalance={home.onEditBalance}
          primaryStatus={home.primaryStatus}
          secondaryStatus={home.secondaryStatus}
          hasActiveDebts={home.hasActiveDebts}
          advisorInsight={home.advisorInsight}
          previewCapitalGain={home.previewCapitalGain}
          progressMilestones={home.progressMilestones}
          goalJourney={home.goalJourney}
          locale={home.locale}
          onOpenIncome={home.onOpenIncome}
          onOpenExpense={home.onOpenExpense}
          showBackupReminder={home.showBackupReminder}
          onExportBackup={home.onExportBackup}
        />
      </Suspense>
    );
  }

  if (activeTab === 'debts') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <DebtsSection
          copy={copy}
          theme={theme}
          fmt={debts.fmt}
          isEnglish={debts.isEnglish}
          debtStrategies={debts.debtStrategies}
          uncoveredRequired={debts.uncoveredRequired}
          safeDebtPaymentNow={debts.safeDebtPaymentNow}
          suggestedDebtPayment={debts.suggestedDebtPayment}
          onUseSuggestedPayment={debts.onUseSuggestedPayment}
          store={debts.store}
          sortedDebts={debts.sortedDebts}
          onOpenNewDebt={debts.onOpenNewDebt}
          onEditDebt={debts.onEditDebt}
          onPayDebt={debts.onPayDebt}
        />
      </Suspense>
    );
  }

  if (activeTab === 'analytics') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AnalyticsSection
          copy={copy}
          theme={theme}
          store={analytics.store}
          isEnglish={analytics.isEnglish}
          analyticsRange={analytics.analyticsRange}
          setAnalyticsRange={analytics.setAnalyticsRange}
          report={analytics.report}
          locale={analytics.locale}
          shareMonthlyExpenses={analytics.shareMonthlyExpenses}
          familyNotice={analytics.familyNotice}
          softPanelStyle={softPanelStyle}
          fmt={analytics.fmt}
        />
      </Suspense>
    );
  }

  if (activeTab === 'history') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <HistorySection
          copy={copy}
          isEnglish={history.isEnglish}
          historyFilterItems={history.historyFilterItems}
          historyFilter={history.historyFilter}
          setHistoryFilter={history.setHistoryFilter}
          historyQuery={history.historyQuery}
          setHistoryQuery={history.setHistoryQuery}
          softPanelStyle={softPanelStyle}
          filteredHistory={history.filteredHistory}
          theme={theme}
          locale={history.locale}
          fmt={history.fmt}
          canEditTransaction={history.canEditTransaction}
          canDeleteTransaction={history.canDeleteTransaction}
          deleteTransaction={history.deleteTransaction}
          reverseTransfer={history.reverseTransfer}
          canReverseTransfer={history.canReverseTransfer}
          onOpenTransaction={history.onOpenTransaction}
        />
      </Suspense>
    );
  }

  return null;
}
