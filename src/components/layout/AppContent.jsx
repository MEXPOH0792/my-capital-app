import React from 'react';
import AppPrimaryContent, { preloadPrimarySections } from './AppPrimaryContent.jsx';
import AppSetupContent, { preloadSetupSections } from './AppSetupContent.jsx';

const SETTINGS_TABS = ['settings', 'distribution', 'obligations', 'accounts', 'limits', 'goals'];

function PageFrame({ pageKey, children }) {
  return (
    <section
      key={pageKey}
      data-page={pageKey}
      className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-hide"
    >
      <div className="mc-page-content mx-auto min-h-full min-w-0 w-full max-w-xl px-4 py-2 md:px-8 md:py-4">
        {children}
      </div>
    </section>
  );
}

export default function AppContent({ shell, home, debts, analytics, history, accounts, finance }) {
  const { activeTab, copy, theme, panelStyle, softPanelStyle, currentSectionMeta, pageTitle } = shell;
  const isSetupScreen = SETTINGS_TABS.includes(activeTab);

  React.useEffect(() => {
    const preload = () => {
      void Promise.all([preloadPrimarySections(), preloadSetupSections()]);
    };
    const timeoutId = window.setTimeout(preload, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <main className="relative h-full overflow-hidden">
      <PageFrame pageKey={activeTab}>
        {isSetupScreen ? (
          <AppSetupContent
            activeTab={activeTab}
            shell={{ copy, theme, panelStyle, softPanelStyle, currentSectionMeta, pageTitle }}
            accounts={accounts}
            finance={finance}
          />
        ) : (
          <AppPrimaryContent
            activeTab={activeTab}
            shell={{ copy, theme, panelStyle, softPanelStyle, currentSectionMeta, pageTitle }}
            home={home}
            debts={debts}
            analytics={analytics}
            history={history}
          />
        )}
      </PageFrame>
    </main>
  );
}
