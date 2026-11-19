import { useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Gauge,
  History,
  Home as HomeIcon,
  Menu,
  Percent,
  Target,
  Wallet,
} from 'lucide-react';

export function useNavigationMeta({ copy, activeTab, isEnglish }) {
  return useMemo(() => {
    const reportLabel = isEnglish ? 'Report' : 'Отчёт';
    const setupLabel = isEnglish ? 'Setup' : 'Настройка';

    const primaryNavItems = [
      { id: 'home', navLabel: copy.nav.home, title: copy.nav.home, icon: HomeIcon },
      { id: 'debts', navLabel: copy.nav.debts, title: copy.nav.debts, icon: Wallet },
      { id: 'history', navLabel: copy.nav.history, title: copy.nav.history, icon: History },
      { id: 'settings', navLabel: setupLabel, title: copy.nav.settings, icon: Menu },
    ];

    const secondaryNavItems = [{ id: 'analytics', navLabel: reportLabel, title: reportLabel, icon: BarChart3 }];

    const mobileNavItems = [
      primaryNavItems[0],
      primaryNavItems[1],
      secondaryNavItems[0],
      primaryNavItems[2],
      primaryNavItems[3],
    ];

    const setupNavItems = [
      {
        id: 'distribution',
        navLabel: isEnglish ? 'Allocation' : 'Распределение',
        title: copy.settings.incomeDistribution,
        icon: Percent,
      },
      {
        id: 'obligations',
        navLabel: isEnglish ? 'Bills' : 'Обязательные',
        title: copy.settings.requiredMonthlyExpenses,
        icon: AlertTriangle,
      },
      {
        id: 'accounts',
        navLabel: isEnglish ? 'Accounts' : 'Счета',
        title: isEnglish ? 'Accounts' : 'Счета',
        icon: Wallet,
      },
      {
        id: 'limits',
        navLabel: isEnglish ? 'Limits' : 'Лимиты',
        title: isEnglish ? 'Spending limits' : 'Лимиты трат',
        icon: Gauge,
      },
      { id: 'goals', navLabel: isEnglish ? 'Goals' : 'Цели', title: copy.settings.financialGoals, icon: Target },
    ];

    const navItems = [...primaryNavItems, ...secondaryNavItems, ...setupNavItems];
    const financeTabIds = setupNavItems.map((item) => item.id);
    const sectionMeta = {
      settings: {
        summary: isEnglish
          ? 'Theme, language, currency, backup, PIN and reset.'
          : 'Тема, язык, резервная копия, PIN и сброс.',
      },
      distribution: {
        summary: isEnglish
          ? 'Choose how income is split before spending starts.'
          : 'Выбери, как доход делится ещё до начала трат.',
      },
      obligations: {
        summary: isEnglish
          ? 'Set your essential bills so the app knows what is safe to spend.'
          : 'Задай ежемесячный минимум, чтобы приложение видело реальную нагрузку.',
      },
      accounts: {
        summary: isEnglish
          ? 'See your spending account, savings buckets and transfers.'
          : 'Здесь видно, где лежат деньги и что защищено от трат.',
      },
      limits: {
        summary: isEnglish
          ? 'A ceiling per category, checked while you enter an expense.'
          : 'Потолок по категории, который проверяется прямо при вводе траты.',
      },
      goals: {
        summary: isEnglish
          ? 'Set your emergency fund and capital growth targets.'
          : 'Задай цели по подушке и росту капитала.',
      },
      analytics: {
        summary: isEnglish
          ? 'Short report, not a full statistics dashboard.'
          : 'Короткий отчёт, а не большой статистический дашборд.',
      },
    };

    return {
      primaryNavItems,
      secondaryNavItems,
      mobileNavItems,
      setupNavItems,
      currentSectionMeta: sectionMeta[activeTab] || null,
      isFinanceSection: financeTabIds.includes(activeTab),
      pageTitle: navItems.find((item) => item.id === activeTab)?.title || copy.appTitle,
      financeSectionLabel: isEnglish ? 'Money setup' : 'Настройка финансов',
      financeGroupLabel: isEnglish ? 'Finance' : 'Финансы',
      insightsGroupLabel: reportLabel,
    };
  }, [activeTab, copy, isEnglish]);
}
