import assert from 'node:assert/strict';
import React from 'react';
import { addTest } from '../harness/runner.js';
import {
  baseTheme,
  fireEvent,
  formatDigits,
  loadUiModules,
  noop,
  render,
  resetDom,
  screen,
  softPanelStyle,
} from '../harness/ui.js';
import { ALLOCATION_MODES } from '../../src/domain/finance.js';
import { getCopy } from '../../src/i18n.js';
import { formatMinorAsCurrency, toMinorUnits } from '../../src/utils/money.js';

addTest('FinanceSetupSection interaction opens advanced distribution and changes basis', async () => {
  resetDom();
  const { FinanceSetupSection } = await loadUiModules();
  const copy = getCopy('en');

  function Wrapper() {
    const [showAdvancedDistribution, setShowAdvancedDistribution] = React.useState(false);
    const [basis, setBasis] = React.useState('total_income');
    const store = {
      language: 'en',
      setLanguage: noop,
      incomeDistributionEnabled: true,
      toggleIncomeDistribution: noop,
      incomeDistributionMode: 'base',
      setIncomeDistributionMode: noop,
      incomeDistributionBasis: basis,
      setIncomeDistributionBasis: setBasis,
      allocationPercents: ALLOCATION_MODES.base.allocation,
      requiredExpenses: [],
      targetCapital: toMinorUnits(1000000),
      targetSafety: toMinorUnits(500000),
      removeRequiredExpense: noop,
    };

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(FinanceSetupSection, {
        activeTab: 'distribution',
        copy,
        store,
        theme: baseTheme,
        shell: {
          softPanelStyle,
          isEnglish: true,
          fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
          formatInput: formatDigits,
        },
        settings: {
          exportBackup: noop,
          importBackup: noop,
          backupNotice: '',
          openOnboardingReconfigure: noop,
          pinEnabled: false,
          securityForm: { pin: '', confirmPin: '' },
          setSecurityForm: noop,
          securityNotice: '',
          saveSecurityPin: noop,
          clearSecurityPin: noop,
          lockAppNow: noop,
          showResetConfirm: false,
          setShowResetConfirm: noop,
          onConfirmReset: noop,
        },
        distribution: {
          showAdvancedDistribution,
          setShowAdvancedDistribution,
          allocationModes: ALLOCATION_MODES,
          setAllocationForm: noop,
          allocationForm: ALLOCATION_MODES.base.allocation,
          handleAllocationInput: noop,
          currentMode: ALLOCATION_MODES.base,
          payYourselfPercent: 14,
          availableForObligations: toMinorUnits(43000),
          previewReservedForRequired: toMinorUnits(20000),
          previewDistribution: {
            toBalance: toMinorUnits(25500),
            toSafety: toMinorUnits(4000),
            toCapital: toMinorUnits(3000),
            toSadaka: toMinorUnits(500),
          },
          totalRequiredExpenses: toMinorUnits(20000),
          obligationsDelta: toMinorUnits(23000),
          allocationTotal: 100,
          saveAllocationSettings: noop,
        },
        obligations: {
          requiredExpenseForm: { title: '', amount: '' },
          setRequiredExpenseForm: noop,
          addRequiredExpenseItem: noop,
        },
        goals: {
          onOpenTargetCapital: noop,
          onOpenTargetSafety: noop,
        },
      }),
      React.createElement('div', { 'data-testid': 'basis' }, basis),
    );
  }

  render(React.createElement(Wrapper));
  fireEvent.click(screen.getByRole('button', { name: copy.settings.change }));
  assert.ok(screen.getAllByText(copy.settings.totalIncome).length >= 1);

  const freeBasisButton = screen
    .getAllByRole('button')
    .find((button) => button.textContent.includes(copy.settings.freeAfterRequired));
  fireEvent.click(freeBasisButton);

  assert.equal(screen.getByTestId('basis').textContent, 'free_after_required');
  resetDom();
});

addTest('FinanceSetupSection smoke renders settings branch with backup and PIN controls', async () => {
  resetDom();
  const { FinanceSetupSection } = await loadUiModules();
  const copy = getCopy('ru');

  render(
    React.createElement(FinanceSetupSection, {
      activeTab: 'settings',
      copy,
      store: { language: 'ru', setLanguage: noop },
      theme: baseTheme,
      shell: {
        softPanelStyle,
        isEnglish: false,
        fmt: (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB'),
        formatInput: formatDigits,
      },
      settings: {
        exportBackup: noop,
        importBackup: noop,
        backupNotice: '',
        openOnboardingReconfigure: noop,
        pinEnabled: false,
        securityForm: { pin: '', confirmPin: '' },
        setSecurityForm: noop,
        securityNotice: '',
        saveSecurityPin: noop,
        clearSecurityPin: noop,
        lockAppNow: noop,
        showResetConfirm: false,
        setShowResetConfirm: noop,
        onConfirmReset: noop,
      },
      distribution: {
        showAdvancedDistribution: false,
        setShowAdvancedDistribution: noop,
        allocationModes: ALLOCATION_MODES,
        setAllocationForm: noop,
        allocationForm: ALLOCATION_MODES.base.allocation,
        handleAllocationInput: noop,
        currentMode: ALLOCATION_MODES.base,
        payYourselfPercent: 14,
        availableForObligations: toMinorUnits(43000),
        previewReservedForRequired: toMinorUnits(20000),
        previewDistribution: {
          toBalance: toMinorUnits(25500),
          toSafety: toMinorUnits(4000),
          toCapital: toMinorUnits(3000),
          toSadaka: toMinorUnits(500),
        },
        totalRequiredExpenses: toMinorUnits(20000),
        obligationsDelta: toMinorUnits(23000),
        allocationTotal: 100,
        saveAllocationSettings: noop,
      },
      obligations: {
        requiredExpenseForm: { title: '', amount: '' },
        setRequiredExpenseForm: noop,
        addRequiredExpenseItem: noop,
      },
      goals: {
        onOpenTargetCapital: noop,
        onOpenTargetSafety: noop,
      },
    }),
  );

  assert.ok(screen.getByText('Интерфейс и резервная копия'));
  fireEvent.click(screen.getByRole('button', { name: /Резервная копия/i }));
  assert.ok(screen.getByText(copy.settings.exportJson));
  assert.ok(screen.getByText('Защита PIN'));
  resetDom();
});
