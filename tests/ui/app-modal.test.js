import assert from 'node:assert/strict';
import React from 'react';
import { addTest } from '../harness/runner.js';
import {
  baseStorageLabels,
  baseTheme,
  loadUiModules,
  noop,
  panelStyle,
  renderHtml,
  selectFieldStyle,
  selectOptionStyle,
  softPanelStyle,
} from '../harness/ui.js';
import { ALLOCATION_MODES } from '../../src/domain/finance.js';
import { getCopy } from '../../src/i18n.js';
import { formatMinorAsCurrency, toMinorUnits } from '../../src/utils/money.js';

addTest('AppModal smoke renders expense modal with helper text and account select', async () => {
  const { AppModal } = await loadUiModules();
  const copy = getCopy('en');
  const html = renderHtml(
    React.createElement(AppModal, {
      modal: 'expense',
      setModal: noop,
      store: {
        incomeDistributionEnabled: true,
        toggleIncomeDistribution: noop,
        setIncomeDistributionMode: noop,
        incomeDistributionMode: 'base',
        allocationPercents: { balance: 86, safety: 8, capital: 6, sadaka: 0 },
      },
      allocationModes: ALLOCATION_MODES,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      panelStyle,
      copy,
      selectedDebt: null,
      inputValue: '5000',
      setInputValue: noop,
      formatInput: (value) => value,
      activeTransactionCategoryPresets: ['Groceries', 'Transport'],
      transactionCategoryForm: { preset: '', custom: '' },
      setTransactionCategoryForm: noop,
      softPanelStyle,
      selectedSpendAccountId: 'card',
      setSelectedSpendAccountId: noop,
      selectFieldStyle,
      selectOptionStyle,
      spendableAccounts: [{ id: 'card', name: 'Card', balance: toMinorUnits(10000) }],
      fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
      modalHelperText: copy.modalHelper.categoryPrefix('Groceries'),
      isModalAmountValid: true,
      storageLabels: baseStorageLabels,
      storagePlacementItems: [],
      handleAction: noop,
      canSubmitAction: true,
      debtForm: { title: '', amount: '', type: 'LIABILITY', addToBalance: true, bankName: '', interestRate: '' },
      setDebtForm: noop,
      createDebt: noop,
    }),
  );

  assert.match(html, /Spending/);
  assert.match(html, /Spend from/);
  assert.match(html, /Category: Groceries/);
});

addTest('AppModal smoke renders compact income controls without account placement block', async () => {
  const { AppModal } = await loadUiModules();
  const copy = getCopy('en');
  const html = renderHtml(
    React.createElement(AppModal, {
      modal: 'income',
      setModal: noop,
      store: {
        incomeDistributionEnabled: true,
        toggleIncomeDistribution: noop,
        setIncomeDistributionMode: noop,
        incomeDistributionMode: 'base',
        allocationPercents: { balance: 86, safety: 8, capital: 6, sadaka: 0 },
      },
      allocationModes: ALLOCATION_MODES,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      panelStyle,
      copy,
      selectedDebt: null,
      inputValue: '5000',
      setInputValue: noop,
      formatInput: (value) => value,
      activeTransactionCategoryPresets: ['Salary'],
      removeIncomePreset: noop,
      transactionCategoryForm: { preset: '', custom: '' },
      setTransactionCategoryForm: noop,
      softPanelStyle,
      selectedSpendAccountId: '',
      setSelectedSpendAccountId: noop,
      selectFieldStyle,
      selectOptionStyle,
      spendableAccounts: [{ id: 'card', name: 'Card', balance: toMinorUnits(10000) }],
      fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
      modalHelperText: '',
      isModalAmountValid: true,
      storageLabels: baseStorageLabels,
      storagePlacementItems: [{ label: 'Main account', value: toMinorUnits(4300), share: 86 }],
      handleAction: noop,
      canSubmitAction: true,
      debtForm: { title: '', amount: '', type: 'LIABILITY', addToBalance: true, bankName: '', interestRate: '' },
      setDebtForm: noop,
      createDebt: noop,
    }),
  );

  assert.match(html, /Auto-allocation/);
  // Presets are one-tap chips; removing them lives behind the "Edit" toggle so
  // the delete control cannot be hit by accident on a phone.
  assert.match(html, /aria-pressed="false"[^>]*>Salary</);
  assert.match(html, />Edit</);
  assert.match(html, /Custom category/);
  assert.doesNotMatch(html, /Main account/);
});

addTest('AppModal smoke renders income edit mode', async () => {
  const { AppModal } = await loadUiModules();
  const copy = getCopy('en');
  const html = renderHtml(
    React.createElement(AppModal, {
      modal: 'edit_income',
      setModal: noop,
      store: {
        incomeDistributionEnabled: false,
        toggleIncomeDistribution: noop,
        setIncomeDistributionMode: noop,
        incomeDistributionMode: 'base',
        allocationPercents: { balance: 100, safety: 0, capital: 0, sadaka: 0 },
      },
      allocationModes: ALLOCATION_MODES,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      panelStyle,
      copy,
      selectedDebt: null,
      selectedTransaction: {
        id: 'tx-income-1',
        type: 'income',
        amount: toMinorUnits(5000),
        category: 'Salary',
        date: new Date('2026-01-16T12:00:00.000Z').toISOString(),
        meta: {
          accountId: 'card',
          accountName: 'Card',
          effects: [{ accountId: 'card', delta: toMinorUnits(5000) }],
          coverage: { monthKey: '2026-01', incomeTotalDelta: toMinorUnits(5000), requiredCoveredDelta: 0 },
        },
      },
      inputValue: '5 000',
      setInputValue: noop,
      formatInput: (value) => value,
      activeTransactionCategoryPresets: ['Salary'],
      removeIncomePreset: noop,
      removeExpensePreset: noop,
      transactionCategoryForm: { preset: '', custom: 'Salary' },
      setTransactionCategoryForm: noop,
      softPanelStyle,
      selectedSpendAccountId: '',
      setSelectedSpendAccountId: noop,
      selectFieldStyle,
      selectOptionStyle,
      spendableAccounts: [],
      fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
      modalHelperText: '',
      isModalAmountValid: true,
      handleAction: noop,
      canSubmitAction: true,
      debtForm: { title: '', amount: '', type: 'LIABILITY', addToBalance: true, bankName: '', interestRate: '' },
      setDebtForm: noop,
      submitDebt: noop,
    }),
  );

  assert.match(html, /Edit income/);
  assert.match(html, /Salary/);
});

addTest('AppModal smoke renders debt edit mode with save action', async () => {
  const { AppModal } = await loadUiModules();
  const copy = getCopy('en');
  const html = renderHtml(
    React.createElement(AppModal, {
      modal: 'edit_debt',
      setModal: noop,
      store: {},
      allocationModes: ALLOCATION_MODES,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      panelStyle,
      copy,
      selectedDebt: { id: 'loan-1' },
      inputValue: '',
      setInputValue: noop,
      formatInput: (value) => value,
      activeTransactionCategoryPresets: [],
      transactionCategoryForm: { preset: '', custom: '' },
      setTransactionCategoryForm: noop,
      softPanelStyle,
      selectedSpendAccountId: '',
      setSelectedSpendAccountId: noop,
      selectFieldStyle,
      selectOptionStyle,
      spendableAccounts: [],
      fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
      modalHelperText: '',
      isModalAmountValid: true,
      handleAction: noop,
      canSubmitAction: true,
      debtForm: {
        title: 'Credit card',
        amount: '12 000',
        type: 'LIABILITY',
        addToBalance: true,
        bankName: 'Bank',
        interestRate: '18',
      },
      setDebtForm: noop,
      submitDebt: noop,
    }),
  );

  assert.match(html, /Edit debt/);
  assert.match(html, /Save changes/);
  assert.doesNotMatch(html, /Count in balance/);
});

addTest('AppModal smoke renders history transaction detail actions', async () => {
  const { AppModal } = await loadUiModules();
  const copy = getCopy('en');
  const html = renderHtml(
    React.createElement(AppModal, {
      modal: 'history_transaction',
      setModal: noop,
      store: {},
      allocationModes: ALLOCATION_MODES,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      panelStyle,
      copy,
      selectedDebt: null,
      selectedTransaction: {
        id: 'tx-1',
        type: 'expense',
        amount: toMinorUnits(1200),
        category: 'Fuel',
        date: new Date('2026-01-16T12:00:00.000Z').toISOString(),
        meta: {
          accountId: 'card',
          accountName: 'Card',
          effects: [{ accountId: 'card', delta: -toMinorUnits(1200) }],
        },
      },
      inputValue: '',
      setInputValue: noop,
      formatInput: (value) => value,
      activeTransactionCategoryPresets: [],
      removeIncomePreset: noop,
      removeExpensePreset: noop,
      transactionCategoryForm: { preset: '', custom: '' },
      setTransactionCategoryForm: noop,
      softPanelStyle,
      selectedSpendAccountId: '',
      setSelectedSpendAccountId: noop,
      selectFieldStyle,
      selectOptionStyle,
      spendableAccounts: [],
      fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
      modalHelperText: '',
      isModalAmountValid: true,
      handleAction: noop,
      canSubmitAction: true,
      canDeleteTransaction: () => true,
      deleteTransaction: () => true,
      canReverseTransfer: () => false,
      reverseTransfer: noop,
      debtForm: { title: '', amount: '', type: 'LIABILITY', addToBalance: true, bankName: '', interestRate: '' },
      setDebtForm: noop,
      submitDebt: noop,
      openTransactionEditModal: noop,
    }),
  );

  assert.match(html, /Fuel/);
  assert.match(html, /Edit/);
  assert.match(html, /Delete/);
});

addTest('AppModal smoke renders edit balance as a centered dialog', async () => {
  const { AppModal } = await loadUiModules();
  const copy = getCopy('en');
  const html = renderHtml(
    React.createElement(AppModal, {
      modal: 'edit_balance',
      setModal: noop,
      store: {},
      allocationModes: ALLOCATION_MODES,
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      panelStyle,
      copy,
      selectedDebt: null,
      inputValue: '5000',
      setInputValue: noop,
      formatInput: (value) => value,
      activeTransactionCategoryPresets: [],
      removeIncomePreset: noop,
      removeExpensePreset: noop,
      transactionCategoryForm: { preset: '', custom: '' },
      setTransactionCategoryForm: noop,
      softPanelStyle,
      selectedSpendAccountId: '',
      setSelectedSpendAccountId: noop,
      selectFieldStyle,
      selectOptionStyle,
      spendableAccounts: [],
      fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
      modalHelperText: '',
      isModalAmountValid: true,
      storageLabels: baseStorageLabels,
      storagePlacementItems: [],
      handleAction: noop,
      canSubmitAction: true,
      debtForm: { title: '', amount: '', type: 'LIABILITY', addToBalance: true, bankName: '', interestRate: '' },
      setDebtForm: noop,
      createDebt: noop,
    }),
  );

  assert.match(html, /items-center/);
  assert.doesNotMatch(html, /rounded-t-\[32px\]/);
});
