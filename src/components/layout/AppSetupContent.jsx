import { Suspense, lazy } from 'react';

const loadAccountsSection = () => import('../sections/AccountsSection.jsx');
const loadFinanceSetupSection = () => import('../sections/FinanceSetupSection.jsx');

const AccountsSection = lazy(loadAccountsSection);
const FinanceSetupSection = lazy(loadFinanceSetupSection);

export function preloadSetupSections() {
  return [loadAccountsSection, loadFinanceSetupSection].reduce(
    (queue, loadChunk) => queue.then(() => loadChunk().catch(() => {})),
    Promise.resolve(),
  );
}

function ScreenFallback() {
  return (
    <div className="min-h-[12rem] rounded-[22px] border border-[var(--mc-border-soft)] bg-[var(--mc-soft-faint)]" />
  );
}

export default function AppSetupContent({ activeTab, shell, accounts, finance }) {
  const { copy, theme, softPanelStyle, currentSectionMeta, pageTitle } = shell;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold opacity-55">{copy.nav.settings}</p>
        <h2 className="text-[clamp(1.55rem,6vw,1.9rem)] font-display font-extrabold tracking-tight leading-[0.98]">
          {pageTitle}
        </h2>
        {currentSectionMeta ? (
          <p className="max-w-xl text-[12px] leading-[1.4] opacity-55">{currentSectionMeta.summary}</p>
        ) : null}
      </div>

      <Suspense fallback={<ScreenFallback />}>
        {activeTab === 'accounts' ? (
          <AccountsSection
            copy={copy}
            store={accounts.store}
            theme={theme}
            shell={{
              softPanelStyle,
              selectFieldStyle: accounts.selectFieldStyle,
              selectOptionStyle: accounts.selectOptionStyle,
              fmt: accounts.fmt,
              locale: accounts.locale,
            }}
            storage={{
              storageLabels: accounts.storageLabels,
              storageForm: accounts.storageForm,
              storageNotice: accounts.storageNotice,
              handleStorageInput: accounts.handleStorageInput,
              formatInput: accounts.formatInput,
              storageSplitTotal: accounts.storageSplitTotal,
              previewStorageItems: accounts.previewStorageItems,
              saveStorageSettings: accounts.saveStorageSettings,
            }}
            activity={{
              transferTransactions: accounts.transferTransactions,
              reverseTransfer: accounts.reverseTransfer,
              canReverseTransfer: accounts.canReverseTransfer,
              selectedAccount: accounts.selectedAccount,
              setSelectedAccountActivityId: accounts.setSelectedAccountActivityId,
              accountActivityTransactions: accounts.accountActivityTransactions,
              canDeleteTransaction: accounts.canDeleteTransaction,
              deleteTransaction: accounts.deleteTransaction,
            }}
            accountCreation={{
              accountForm: accounts.accountForm,
              setAccountForm: accounts.setAccountForm,
              addCustomAccount: accounts.addCustomAccount,
            }}
            transfer={{
              transferForm: accounts.transferForm,
              setTransferForm: accounts.setTransferForm,
              submitTransfer: accounts.submitTransfer,
              canSubmitTransfer: accounts.canSubmitTransfer,
              transferAmountValue: accounts.transferAmountValue,
              isTransferAmountValid: accounts.isTransferAmountValid,
              fromTransferAccount: accounts.fromTransferAccount,
              toTransferAccount: accounts.toTransferAccount,
            }}
          />
        ) : (
          <FinanceSetupSection
            activeTab={activeTab}
            copy={copy}
            store={finance.store}
            theme={theme}
            shell={{
              softPanelStyle,
              isEnglish: finance.isEnglish,
              fmt: finance.fmt,
              formatInput: finance.formatInput,
              locale: finance.locale,
            }}
            settings={{
              exportBackup: finance.exportBackup,
              importBackup: finance.importBackup,
              undoImport: finance.undoImport,
              backupNotice: finance.backupNotice,
              familyNotice: finance.familyNotice,
              importPartnerReport: finance.importPartnerReport,
              removePartnerReport: finance.removePartnerReport,
              removePartner: finance.removePartner,
              openOnboardingReconfigure: finance.openOnboardingReconfigure,
              pinEnabled: finance.pinEnabled,
              securityForm: finance.securityForm,
              setSecurityForm: finance.setSecurityForm,
              securityNotice: finance.securityNotice,
              saveSecurityPin: finance.saveSecurityPin,
              clearSecurityPin: finance.clearSecurityPin,
              lockAppNow: finance.lockAppNow,
              showResetConfirm: finance.showResetConfirm,
              setShowResetConfirm: finance.setShowResetConfirm,
              onConfirmReset: finance.onConfirmReset,
            }}
            distribution={{
              showAdvancedDistribution: finance.showAdvancedDistribution,
              setShowAdvancedDistribution: finance.setShowAdvancedDistribution,
              allocationModes: finance.allocationModes,
              setAllocationForm: finance.setAllocationForm,
              allocationForm: finance.allocationForm,
              handleAllocationInput: finance.handleAllocationInput,
              currentMode: finance.currentMode,
              payYourselfPercent: finance.payYourselfPercent,
              availableForObligations: finance.availableForObligations,
              previewReservedForRequired: finance.previewReservedForRequired,
              previewDistribution: finance.previewDistribution,
              totalRequiredExpenses: finance.totalRequiredExpenses,
              obligationsDelta: finance.obligationsDelta,
              allocationTotal: finance.allocationTotal,
              saveAllocationSettings: finance.saveAllocationSettings,
            }}
            obligations={{
              requiredExpenseForm: finance.requiredExpenseForm,
              setRequiredExpenseForm: finance.setRequiredExpenseForm,
              addRequiredExpenseItem: finance.addRequiredExpenseItem,
            }}
            goals={{
              onOpenTargetCapital: finance.onOpenTargetCapital,
              onOpenTargetSafety: finance.onOpenTargetSafety,
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
