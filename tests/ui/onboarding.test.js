import assert from 'node:assert/strict';
import React from 'react';
import { addTest } from '../harness/runner.js';
import {
  baseTheme,
  fireEvent,
  formatDigits,
  loadUiModules,
  noop,
  panelStyle,
  render,
  renderHtml,
  resetDom,
  rootStyle,
  screen,
  softPanelStyle,
} from '../harness/ui.js';
import { ALLOCATION_MODES } from '../../src/domain/finance.js';
import { getCopy } from '../../src/i18n.js';
import { parseMoneyInputToMinor, toMinorUnits } from '../../src/utils/money.js';

addTest('OnboardingSetupScreen interaction advances through steps after entering balances', async () => {
  resetDom();
  const { OnboardingSetupScreen } = await loadUiModules();
  const copy = getCopy('en');

  function Wrapper() {
    const [onboardingStep, setOnboardingStep] = React.useState(1);
    const [balances, setBalances] = React.useState({
      liquidPrimary: '',
      safety: '',
      capital: '',
    });
    const [debts, setDebts] = React.useState([]);
    const [requiredExpenses, setRequiredExpenses] = React.useState([]);
    const [targets, setTargets] = React.useState({ targetSafety: '500000', targetCapital: '1000000' });
    const [onboardingMode, setOnboardingMode] = React.useState('base');

    const accountFields = [
      { key: 'liquidPrimary', label: 'Card', protected: false },
      { key: 'safety', label: 'Safety jar', protected: true },
      { key: 'capital', label: 'Capital jar', protected: true },
    ];
    const totalMoneyMinor = Object.values(balances).reduce((sum, value) => sum + parseMoneyInputToMinor(value), 0);

    return React.createElement(OnboardingSetupScreen, {
      copy,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      rootStyle,
      panelStyle,
      softPanelStyle,
      formatInput: formatDigits,
      onboardingStep,
      setOnboardingStep,
      balances,
      setBalances,
      accountFields,
      totalMoney: totalMoneyMinor,
      debts,
      addDebt: () =>
        setDebts((prev) => [
          ...prev,
          { id: `d${prev.length + 1}`, title: '', amount: '', bankName: '', interestRate: '' },
        ]),
      updateDebt: (id, field, value) =>
        setDebts((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))),
      removeDebt: (id) => setDebts((prev) => prev.filter((item) => item.id !== id)),
      requiredExpenses,
      addRequiredExpense: () =>
        setRequiredExpenses((prev) => [...prev, { id: `r${prev.length + 1}`, title: '', amount: '' }]),
      updateRequiredExpense: (id, field, value) =>
        setRequiredExpenses((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))),
      removeRequiredExpense: (id) => setRequiredExpenses((prev) => prev.filter((item) => item.id !== id)),
      targets,
      setTargets,
      allocationModes: ALLOCATION_MODES,
      onboardingMode,
      setOnboardingMode,
      submitOnboarding: noop,
      isReconfigureMode: false,
      canExit: false,
      onExit: noop,
      hasLiveHistory: false,
      toggleTheme: noop,
      setLanguage: noop,
    });
  }

  render(React.createElement(Wrapper));
  assert.ok(screen.getByText(copy.onboarding.money.title));

  fireEvent.change(screen.getAllByPlaceholderText('0')[0], { target: { value: '50000' } });
  fireEvent.click(screen.getByRole('button', { name: copy.onboarding.continue }));

  assert.ok(screen.getByRole('heading', { name: copy.onboarding.debts.title }));
  resetDom();
});

addTest('OnboardingSetupScreen smoke renders current step with localized copy', async () => {
  const { OnboardingSetupScreen } = await loadUiModules();
  const copy = getCopy('en');
  const html = renderHtml(
    React.createElement(OnboardingSetupScreen, {
      copy,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      rootStyle,
      panelStyle,
      softPanelStyle,
      formatInput: (value) => value,
      onboardingStep: 2,
      setOnboardingStep: noop,
      balances: { liquidPrimary: '50000', safety: '', capital: '' },
      setBalances: noop,
      accountFields: [
        { key: 'liquidPrimary', label: 'Card', protected: false },
        { key: 'safety', label: 'Safety jar', protected: true },
        { key: 'capital', label: 'Capital jar', protected: true },
      ],
      totalMoney: toMinorUnits(50000),
      debts: [{ id: 'd1', title: 'Credit card', amount: '100000', bankName: 'Bank', interestRate: '11' }],
      addDebt: noop,
      updateDebt: noop,
      removeDebt: noop,
      requiredExpenses: [],
      addRequiredExpense: noop,
      updateRequiredExpense: noop,
      removeRequiredExpense: noop,
      targets: { targetSafety: '500000', targetCapital: '1000000' },
      setTargets: noop,
      allocationModes: ALLOCATION_MODES,
      onboardingMode: 'base',
      setOnboardingMode: noop,
      submitOnboarding: noop,
      isReconfigureMode: false,
      canExit: false,
      onExit: noop,
      hasLiveHistory: false,
      toggleTheme: noop,
      setLanguage: noop,
    }),
  );

  assert.ok(html.includes('Active debts'));
  assert.ok(html.includes('Interest rate'));
  assert.ok(html.includes('Bank or person'));
});
