import SettingsPanel from './finance/SettingsPanel.jsx';
import DistributionPanel from './finance/DistributionPanel.jsx';
import ObligationsPanel from './finance/ObligationsPanel.jsx';
import GoalsPanel from './finance/GoalsPanel.jsx';
import LimitsPanel from './finance/LimitsPanel.jsx';
import { getFinanceSectionText } from './finance/financeSectionText.js';

export default function FinanceSetupSection({
  activeTab,
  copy,
  store,
  theme,
  shell,
  settings,
  distribution,
  obligations,
  goals,
}) {
  const { softPanelStyle, isEnglish, fmt, formatInput, locale } = shell;
  const text = getFinanceSectionText(isEnglish);

  if (activeTab === 'settings') {
    return (
      <SettingsPanel
        copy={copy}
        store={store}
        theme={theme}
        softPanelStyle={softPanelStyle}
        text={text}
        settings={settings}
        locale={locale}
        fmt={fmt}
      />
    );
  }

  if (activeTab === 'distribution') {
    return (
      <DistributionPanel
        copy={copy}
        store={store}
        theme={theme}
        softPanelStyle={softPanelStyle}
        text={text}
        distribution={distribution}
        fmt={fmt}
        isEnglish={isEnglish}
      />
    );
  }

  if (activeTab === 'obligations') {
    return (
      <ObligationsPanel
        copy={copy}
        store={store}
        theme={theme}
        softPanelStyle={softPanelStyle}
        text={text}
        obligations={obligations}
        fmt={fmt}
        formatInput={formatInput}
      />
    );
  }

  if (activeTab === 'limits') {
    return (
      <LimitsPanel
        copy={copy}
        store={store}
        theme={theme}
        softPanelStyle={softPanelStyle}
        fmt={fmt}
        formatInput={formatInput}
        isEnglish={isEnglish}
      />
    );
  }

  if (activeTab === 'goals') {
    return (
      <GoalsPanel
        copy={copy}
        store={store}
        theme={theme}
        text={text}
        onOpenTargetCapital={goals.onOpenTargetCapital}
        onOpenTargetSafety={goals.onOpenTargetSafety}
        fmt={fmt}
      />
    );
  }

  return null;
}
