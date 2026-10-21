// UI test helpers: shared theme/style constants, Vite SSR module loader for JSX
// components, and a thin re-export of @testing-library/react primitives.

import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';

// Re-export @testing-library/react primitives as a top-level import so each test
// file does not need to await an async import dance.
const tlr = await import('@testing-library/react');
export const { render, screen, fireEvent, cleanup, act, waitFor } = tlr;

export const renderHtml = (element) => renderToStaticMarkup(element);

export const baseTheme = {
  bg: '#000',
  surface: '#111',
  surfaceSoft: '#161616',
  border: 'rgba(255,255,255,0.08)',
  accent: '#3b82f6',
};

export const panelStyle = { backgroundColor: baseTheme.surface, borderColor: baseTheme.border };
export const softPanelStyle = { backgroundColor: baseTheme.surfaceSoft, borderColor: baseTheme.border };
export const rootStyle = { backgroundColor: baseTheme.bg, color: '#fff' };
export const selectFieldStyle = { ...softPanelStyle, color: '#fff', colorScheme: 'dark' };
export const selectOptionStyle = { color: '#fff', backgroundColor: baseTheme.surface };

export const baseStorageLabels = {
  title: 'Storage places',
  subtitle: 'Physical storage places',
  liquidSplit: 'Liquid split',
  liquidHint: 'Split for life money',
  primaryFallback: 'Main account',
  secondaryFallback: '',
  safetyFallback: 'Safety jar',
  capitalFallback: 'Capital jar',
  splitTotal: 'Split total',
  dedicatedPlaces: 'Dedicated places',
  previewTitle: 'Preview',
  reserveNote: 'Reserve note',
  save: 'Save',
  placementTitle: 'Placement',
};

export const resetDom = () => {
  cleanup();
  document.body.innerHTML = '';
};

export const noop = () => {};
export const formatDigits = (value) => String(value ?? '').replace(/\D/g, '');

let viteServer;
let uiModules;

export const loadUiModules = async () => {
  if (uiModules) return uiModules;
  viteServer = await createServer({
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, entries: [] },
    esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  });
  const [
    homeModule,
    onboardingModule,
    accountsModule,
    financeModule,
    historyModule,
    analyticsModule,
    debtsModule,
    lockScreenModule,
    modalModule,
    accountsOverviewModule,
  ] = await Promise.all([
    viteServer.ssrLoadModule('/src/components/sections/HomeSection.jsx'),
    viteServer.ssrLoadModule('/src/components/onboarding/OnboardingSetupScreen.jsx'),
    viteServer.ssrLoadModule('/src/components/sections/AccountsSection.jsx'),
    viteServer.ssrLoadModule('/src/components/sections/FinanceSetupSection.jsx'),
    viteServer.ssrLoadModule('/src/components/sections/HistorySection.jsx'),
    viteServer.ssrLoadModule('/src/components/sections/AnalyticsSection.jsx'),
    viteServer.ssrLoadModule('/src/components/sections/DebtsSection.jsx'),
    viteServer.ssrLoadModule('/src/components/layout/AppLockScreen.jsx'),
    viteServer.ssrLoadModule('/src/components/modals/AppModal.jsx'),
    viteServer.ssrLoadModule('/src/components/sections/accounts/AccountsOverviewPanel.jsx'),
  ]);
  uiModules = {
    HomeSection: homeModule.default,
    OnboardingSetupScreen: onboardingModule.default,
    AccountsSection: accountsModule.default,
    AccountsOverviewPanel: accountsOverviewModule.default,
    FinanceSetupSection: financeModule.default,
    HistorySection: historyModule.default,
    AnalyticsSection: analyticsModule.default,
    DebtsSection: debtsModule.default,
    AppLockScreen: lockScreenModule.default,
    AppModal: modalModule.default,
  };
  return uiModules;
};

export const closeViteServer = async () => {
  if (viteServer) {
    await viteServer.close();
    viteServer = undefined;
  }
};
