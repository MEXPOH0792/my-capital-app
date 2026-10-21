import React, { useMemo, useState } from 'react';
import { Suspense, lazy } from 'react';
import AppSidebar from './components/layout/AppSidebar.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import AppContent from './components/layout/AppContent.jsx';
import AppModalHost from './components/layout/AppModalHost.jsx';
import AppLockScreen from './components/layout/AppLockScreen.jsx';
import StorageRecoveryScreen from './components/layout/StorageRecoveryScreen.jsx';
import PasswordDialogHost from './components/modals/PasswordDialogHost.jsx';
import { loadBackupPayload } from './hooks/workspace/backupFile.js';
import { requestBackupPassword } from './utils/passwordDialog.js';
import { areSecureWritesSuspended, resumeSecureWrites, suspendSecureWrites } from './utils/secureBridgeStorage.js';
import { useAppShell } from './app/useAppShell.js';
import { useAppViewProps } from './app/useAppViewProps.js';
import { useAndroidBackButton } from './hooks/useAndroidBackButton.js';
import { useWidgetSync } from './hooks/useWidgetSync.js';
import { useWidgetDeepLink } from './hooks/useWidgetDeepLink.js';
import { OnboardingSkeleton } from './components/ui/Skeleton.jsx';

const OnboardingSetupScreen = lazy(() => import('./components/onboarding/OnboardingSetupScreen.jsx'));

export default function App() {
  const {
    store,
    copy,
    isEnglish,
    theme,
    security,
    workspace,
    panelStyle,
    softPanelStyle,
    selectFieldStyle,
    selectOptionStyle,
    rootStyle,
  } = useAppShell();
  const appView = useAppViewProps({
    store,
    copy,
    isEnglish,
    theme,
    security,
    workspace,
    panelStyle,
    softPanelStyle,
    selectFieldStyle,
    selectOptionStyle,
  });

  // Wire the Android back button to close the most-foreground thing first:
  // open modal → sidebar → non-home tab. When nothing is consumable the hook
  // minimizes the app instead of fighting with the user.
  const backLayers = useMemo(
    () => [
      () => {
        if (workspace.modalFlow?.modal) {
          workspace.modalFlow.setModal(null);
          return true;
        }
        return false;
      },
      () => {
        if (workspace.isSidebarOpen) {
          workspace.setIsSidebarOpen(false);
          return true;
        }
        return false;
      },
      () => {
        if (workspace.activeTab !== 'home') {
          workspace.setActiveTab('home');
          return true;
        }
        return false;
      },
    ],
    [
      workspace.modalFlow,
      workspace.isSidebarOpen,
      workspace.activeTab,
      workspace.setIsSidebarOpen,
      workspace.setActiveTab,
    ],
  );
  useAndroidBackButton(backLayers);
  useWidgetSync();

  // Widget tap-actions: open income/expense modal directly. Body tap just
  // brings the app to the foreground on the home tab.
  const widgetActions = useMemo(
    () => ({
      open: () => workspace.setActiveTab('home'),
      income: () => workspace.modalFlow?.openTransactionModal?.('income'),
      expense: () => workspace.modalFlow?.openTransactionModal?.('expense'),
    }),
    [workspace.modalFlow, workspace.setActiveTab],
  );
  useWidgetDeepLink(widgetActions);

  // Saved data that could not be decrypted: writes were suspended at store
  // start-up, and the user decides here what happens next.
  const [needsRecovery, setNeedsRecovery] = useState(areSecureWritesSuspended);

  const restoreFromFile = async (file) => {
    const payload = await loadBackupPayload(file, { isEnglish, askPassword: requestBackupPassword });
    if (!payload) return;
    resumeSecureWrites();
    try {
      // The install secret may be gone with the rest of the unreadable data,
      // so a signature from "another device" is expected here.
      await store.importDataAsync(payload, { acceptInvalid: true });
    } catch (error) {
      suspendSecureWrites();
      throw error;
    }
    setNeedsRecovery(false);
  };

  const startOver = () => {
    resumeSecureWrites();
    setNeedsRecovery(false);
  };

  if (needsRecovery) {
    return (
      <>
        <StorageRecoveryScreen
          isEnglish={isEnglish}
          theme={theme}
          rootStyle={rootStyle}
          panelStyle={panelStyle}
          onRestoreFile={restoreFromFile}
          onStartOver={startOver}
        />
        <PasswordDialogHost isEnglish={isEnglish} theme={theme} />
      </>
    );
  }

  if (security.isLocked) {
    return (
      <>
        <AppLockScreen
          {...appView.lockProps}
          rootStyle={rootStyle}
          panelStyle={panelStyle}
          softPanelStyle={softPanelStyle}
        />
        <PasswordDialogHost isEnglish={isEnglish} theme={theme} />
      </>
    );
  }

  if (appView.isOnboardingVisible) {
    return (
      <Suspense fallback={<OnboardingSkeleton rootStyle={rootStyle} />}>
        <OnboardingSetupScreen {...appView.onboardingProps} rootStyle={rootStyle} />
      </Suspense>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none font-ui transition-colors duration-500"
      style={rootStyle}
    >
      <AppSidebar {...appView.sidebarProps} />

      <AppHeader {...appView.headerProps} />

      <div className="flex-1 overflow-hidden pb-[calc(10px+var(--safe-bottom))] pt-[calc(72px+var(--safe-top))] md:pb-0 md:pt-[calc(88px+var(--safe-top))]">
        <AppContent
          shell={appView.shellProps}
          home={appView.homeProps}
          debts={appView.debtProps}
          analytics={appView.analyticsProps}
          history={appView.historyProps}
          accounts={appView.accountsProps}
          finance={appView.financeProps}
        />
      </div>

      <AppModalHost {...appView.modalHostProps} />
      <PasswordDialogHost isEnglish={isEnglish} theme={theme} />
    </div>
  );
}
