import { startTransition, useEffect, useMemo, useState } from 'react';
import { ALLOCATION_MODES } from '../domain/finance.js';
import { LOCALES } from '../i18n.js';
import { formatMinorAsCurrency, formatMinorAsInput, sanitizeMoneyInput } from '../utils/money.js';
import { markPerf, measurePerf } from '../utils/perfMarks.js';
import { useFinanceViewModel } from './useFinanceViewModel.js';
import { useHistoryAnalyticsViewModel } from './useHistoryAnalyticsViewModel.js';
import { useModalFlow } from './useModalFlow.js';
import { useNavigationMeta } from './useNavigationMeta.js';
import { useOnboardingFlow } from './useOnboardingFlow.js';
import { useWorkspaceActions } from './useWorkspaceActions.js';

export function useWorkspaceFlow({ store, copy, isEnglish, security }) {
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [analyticsRange, setAnalyticsRange] = useState({
    preset: '30d',
    from: '',
    to: '',
  });

  const locale = LOCALES[store.language] || LOCALES.ru;
  const allocationModes = useMemo(
    () => ({
      soft: { ...ALLOCATION_MODES.soft, label: copy.modes.soft.label, description: copy.modes.soft.description },
      base: { ...ALLOCATION_MODES.base, label: copy.modes.base.label, description: copy.modes.base.description },
      growth: {
        ...ALLOCATION_MODES.growth,
        label: copy.modes.growth.label,
        description: copy.modes.growth.description,
      },
      custom: {
        ...ALLOCATION_MODES.custom,
        label: copy.modes.custom.label,
        description: copy.modes.custom.description,
      },
    }),
    [copy],
  );

  const fmt = (value) => formatMinorAsCurrency(value, locale, store.currency);
  const formatInput = (value) => sanitizeMoneyInput(value, locale);
  const formatStoredInput = (value) => formatMinorAsInput(value, locale);

  const changeActiveTab = (nextTab) => {
    if (nextTab !== activeTab) markPerf(`tab:${nextTab}:start`);
    startTransition(() => {
      setActiveTab(nextTab);
      setIsSidebarOpen(false);
    });
  };

  useEffect(() => {
    measurePerf(`tab:${activeTab}:ready`, `tab:${activeTab}:start`, `tab:${activeTab}:ready-mark`);
  }, [activeTab]);

  const workspaceActions = useWorkspaceActions({
    store,
    copy,
    isEnglish,
    security,
    locale,
    fmt,
  });

  const financeView = useFinanceViewModel({
    store,
    copy,
    isEnglish,
    locale,
    fmt,
    allocationModes,
    allocationForm: workspaceActions.allocationForm,
    storageForm: workspaceActions.storageForm,
  });

  const historyAnalyticsView = useHistoryAnalyticsViewModel({
    store,
    copy,
    isEnglish,
    activeTab,
    analyticsRange,
    historyFilter,
    historyQuery,
    selectedAccountActivityId: workspaceActions.selectedAccountActivityId,
  });

  const navigation = useNavigationMeta({ copy, activeTab, isEnglish });

  const onboarding = useOnboardingFlow({
    store,
    isEnglish,
    formatStoredInput,
    storageLabels: financeView.storageLabels,
  });

  const modalFlow = useModalFlow({
    store,
    copy,
    isEnglish,
    spendableAccounts: workspaceActions.spendableAccounts,
    fmt,
    formatStoredInput,
  });

  const isOnboardingVisible = !store.isOnboardingCompleted || onboarding.isReconfigureMode;

  return {
    activeTab,
    setActiveTab: changeActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    historyFilter,
    setHistoryFilter,
    historyQuery,
    setHistoryQuery,
    analyticsRange,
    setAnalyticsRange,
    locale,
    allocationModes,
    fmt,
    formatInput,
    formatStoredInput,
    onboarding,
    modalFlow,
    security,
    isOnboardingVisible,
    ...workspaceActions,
    ...financeView,
    ...historyAnalyticsView,
    ...navigation,
  };
}
