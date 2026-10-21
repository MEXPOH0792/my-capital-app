import React from 'react';
import AppPrimaryContent, { preloadPrimarySections } from './AppPrimaryContent.jsx';
import AppSetupContent, { preloadSetupSections } from './AppSetupContent.jsx';

const SETTINGS_TABS = ['settings', 'distribution', 'obligations', 'accounts', 'limits', 'goals'];

function PageFrame({ pageKey, children }) {
  // `key={pageKey}` forces React to remount the section on tab change, which
  // restarts the CSS keyframe via the `mc-tab-page` class. Cheap, no JS state.
  return (
    <section key={pageKey} className="mc-tab-page absolute inset-0 overflow-y-auto overscroll-contain scrollbar-hide">
      <div className="mx-auto min-h-full w-full max-w-xl px-4 py-2 md:px-12 md:py-4">{children}</div>
    </section>
  );
}

export default function AppContent({ shell, home, debts, analytics, history, accounts, finance }) {
  const { activeTab, copy, theme, panelStyle, softPanelStyle, currentSectionMeta, pageTitle } = shell;
  const isSetupScreen = SETTINGS_TABS.includes(activeTab);

  React.useEffect(() => {
    const preload = () => {
      void preloadPrimarySections().then(preloadSetupSections);
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback?.(idleId);
    }

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
