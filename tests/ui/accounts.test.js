import assert from 'node:assert/strict';
import React from 'react';
import { addTest } from '../harness/runner.js';
import {
  baseStorageLabels,
  baseTheme,
  fireEvent,
  formatDigits,
  loadUiModules,
  noop,
  render,
  renderHtml,
  resetDom,
  screen,
  selectFieldStyle,
  selectOptionStyle,
  softPanelStyle,
} from '../harness/ui.js';
import { getCopy } from '../../src/i18n.js';
import { formatMinorAsCurrency, parseMoneyInputToMinor, toMinorUnits } from '../../src/utils/money.js';

addTest('AccountsSection interaction submits transfer after selecting accounts and amount', async () => {
  resetDom();
  const { AccountsSection } = await loadUiModules();
  const copy = getCopy('en');
  const accounts = [
    { id: 'card', name: 'Card', balance: toMinorUnits(40000), includeInSpendable: true, isSystem: true },
    { id: 'safety', name: 'Safety jar', balance: toMinorUnits(10000), includeInSpendable: false, isSystem: true },
  ];

  function Wrapper() {
    const [transferForm, setTransferForm] = React.useState({ fromId: '', toId: '', amount: '' });
    const [submitted, setSubmitted] = React.useState('');
    const transferAmountValue = parseMoneyInputToMinor(transferForm.amount);
    const fromTransferAccount = accounts.find((item) => item.id === transferForm.fromId) ?? null;
    const toTransferAccount = accounts.find((item) => item.id === transferForm.toId) ?? null;
    const canSubmitTransfer = Boolean(
      fromTransferAccount &&
      toTransferAccount &&
      transferAmountValue > 0 &&
      transferAmountValue <= fromTransferAccount.balance,
    );

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(AccountsSection, {
        copy,
        store: { accounts },
        theme: baseTheme,
        shell: {
          softPanelStyle,
          selectFieldStyle,
          selectOptionStyle,
          fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
          locale: 'en-US',
        },
        storage: {
          storageLabels: baseStorageLabels,
          storageForm: {
            liquidPrimaryName: 'Card',
            liquidSecondaryName: '',
            liquidPrimaryPercent: '100',
            liquidSecondaryPercent: '0',
            safetyName: 'Safety jar',
            capitalName: 'Capital jar',
          },
          handleStorageInput: noop,
          formatInput: formatDigits,
          storageSplitTotal: 100,
          previewStorageItems: [{ label: 'Card', value: toMinorUnits(1000) }],
          saveStorageSettings: noop,
        },
        activity: {
          transferTransactions: [],
          reverseTransfer: noop,
          canReverseTransfer: () => false,
          selectedAccount: accounts[0],
          setSelectedAccountActivityId: noop,
          accountActivityTransactions: [],
          canDeleteTransaction: () => false,
          deleteTransaction: noop,
        },
        accountCreation: {
          accountForm: { name: '', amount: '', includeInSpendable: true },
          setAccountForm: noop,
          addCustomAccount: noop,
        },
        transfer: {
          transferForm,
          setTransferForm,
          submitTransfer: () => setSubmitted(`${transferForm.fromId}:${transferForm.toId}:${transferAmountValue}`),
          canSubmitTransfer,
          transferAmountValue,
          isTransferAmountValid: transferAmountValue > 0,
          fromTransferAccount,
          toTransferAccount,
        },
      }),
      React.createElement('div', { 'data-testid': 'submitted-transfer' }, submitted),
    );
  }

  render(React.createElement(Wrapper));
  fireEvent.click(screen.getAllByRole('button', { name: /^transfer$/i })[0]);
  fireEvent.click(screen.getByRole('button', { name: /choose source/i }));
  fireEvent.click(screen.getByRole('button', { name: /card/i }));
  fireEvent.click(screen.getByRole('button', { name: /choose destination/i }));
  fireEvent.click(screen.getByRole('button', { name: /safety jar/i }));
  fireEvent.change(screen.getAllByPlaceholderText(copy.settings.amount)[0], { target: { value: '5000' } });

  fireEvent.click(screen.getAllByRole('button', { name: copy.accountsSection.move }).at(-1));

  assert.equal(screen.getByTestId('submitted-transfer').textContent, 'card:safety:500000');
  resetDom();
});

addTest('AccountsSection interaction sets a different main account', async () => {
  resetDom();
  const { AccountsSection } = await loadUiModules();
  const copy = getCopy('ru');

  function Wrapper() {
    const [accounts, setAccounts] = React.useState([
      {
        id: 'main',
        name: 'Основной счёт',
        balance: toMinorUnits(40000),
        includeInSpendable: true,
        isPrimary: true,
        isSystem: true,
      },
      {
        id: 'vacation',
        name: 'Отпуск',
        balance: toMinorUnits(10000),
        includeInSpendable: true,
        isPrimary: false,
        isSystem: false,
      },
    ]);

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(AccountsSection, {
        copy,
        store: {
          accounts,
          setPrimaryAccount: (accountId) =>
            setAccounts((prev) => prev.map((account) => ({ ...account, isPrimary: account.id === accountId }))),
          moveAccountPriority: (accountId, direction) =>
            setAccounts((prev) => {
              const currentIndex = prev.findIndex((account) => account.id === accountId);
              const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
              if (currentIndex === -1 || nextIndex < 0 || nextIndex >= prev.length) return prev;
              const next = [...prev];
              const [moved] = next.splice(currentIndex, 1);
              next.splice(nextIndex, 0, moved);
              return next;
            }),
        },
        theme: baseTheme,
        shell: {
          softPanelStyle,
          selectFieldStyle,
          selectOptionStyle,
          fmt: (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB'),
          locale: 'ru-RU',
        },
        storage: {
          storageLabels: baseStorageLabels,
          storageForm: {
            liquidPrimaryName: 'Основной счёт',
            liquidSecondaryName: '',
            liquidPrimaryPercent: '100',
            liquidSecondaryPercent: '0',
            safetyName: 'Копилка: подушка',
            capitalName: 'Копилка: капитал',
          },
          handleStorageInput: noop,
          formatInput: (value) => value,
          storageSplitTotal: 100,
          previewStorageItems: [{ label: 'Основной счёт', value: toMinorUnits(1000) }],
          saveStorageSettings: noop,
        },
        activity: {
          transferTransactions: [],
          reverseTransfer: noop,
          canReverseTransfer: () => false,
          selectedAccount: accounts[0],
          setSelectedAccountActivityId: noop,
          accountActivityTransactions: [],
          canDeleteTransaction: () => false,
          deleteTransaction: noop,
        },
        accountCreation: {
          accountForm: { name: '', amount: '', includeInSpendable: true },
          setAccountForm: noop,
          addCustomAccount: noop,
        },
        transfer: {
          transferForm: { fromId: '', toId: '', amount: '' },
          setTransferForm: noop,
          submitTransfer: noop,
          canSubmitTransfer: false,
          transferAmountValue: 0,
          isTransferAmountValid: false,
          fromTransferAccount: null,
          toTransferAccount: null,
        },
      }),
      React.createElement(
        'div',
        { 'data-testid': 'main-account-name' },
        accounts.find((item) => item.isPrimary)?.name || '',
      ),
    );
  }

  render(React.createElement(Wrapper));
  fireEvent.click(screen.getByRole('button', { name: 'Счета' }));
  fireEvent.click(screen.getByRole('button', { name: 'Сделать главным' }));
  assert.equal(screen.getByTestId('main-account-name').textContent, 'Отпуск');
  resetDom();
});

addTest('AccountsSection interaction changes account priority', async () => {
  resetDom();
  const { AccountsSection } = await loadUiModules();
  const copy = getCopy('ru');

  function Wrapper() {
    const [accounts, setAccounts] = React.useState([
      {
        id: 'main',
        name: 'Основной счёт',
        balance: toMinorUnits(40000),
        includeInSpendable: true,
        isPrimary: true,
        isSystem: true,
      },
      {
        id: 'vacation',
        name: 'Отпуск',
        balance: toMinorUnits(10000),
        includeInSpendable: true,
        isPrimary: false,
        isSystem: false,
      },
      {
        id: 'reserve',
        name: 'Резерв',
        balance: toMinorUnits(5000),
        includeInSpendable: false,
        isPrimary: false,
        isSystem: false,
      },
    ]);

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(AccountsSection, {
        copy,
        store: {
          accounts,
          setPrimaryAccount: noop,
          moveAccountPriority: (accountId, direction) =>
            setAccounts((prev) => {
              const currentIndex = prev.findIndex((account) => account.id === accountId);
              const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
              if (currentIndex === -1 || nextIndex < 0 || nextIndex >= prev.length) return prev;
              const next = [...prev];
              const [moved] = next.splice(currentIndex, 1);
              next.splice(nextIndex, 0, moved);
              return next;
            }),
        },
        theme: baseTheme,
        shell: {
          softPanelStyle,
          selectFieldStyle,
          selectOptionStyle,
          fmt: (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB'),
          locale: 'ru-RU',
        },
        storage: {
          storageLabels: baseStorageLabels,
          storageForm: {
            liquidPrimaryName: 'Основной счёт',
            liquidSecondaryName: '',
            liquidPrimaryPercent: '100',
            liquidSecondaryPercent: '0',
            safetyName: 'Копилка: подушка',
            capitalName: 'Копилка: капитал',
          },
          handleStorageInput: noop,
          formatInput: (value) => value,
          storageSplitTotal: 100,
          previewStorageItems: [{ label: 'Основной счёт', value: toMinorUnits(1000) }],
          saveStorageSettings: noop,
        },
        activity: {
          transferTransactions: [],
          reverseTransfer: noop,
          canReverseTransfer: () => false,
          selectedAccount: accounts[0],
          setSelectedAccountActivityId: noop,
          accountActivityTransactions: [],
          canDeleteTransaction: () => false,
          deleteTransaction: noop,
        },
        accountCreation: {
          accountForm: { name: '', amount: '', includeInSpendable: true },
          setAccountForm: noop,
          addCustomAccount: noop,
        },
        transfer: {
          transferForm: { fromId: '', toId: '', amount: '' },
          setTransferForm: noop,
          submitTransfer: noop,
          canSubmitTransfer: false,
          transferAmountValue: 0,
          isTransferAmountValid: false,
          fromTransferAccount: null,
          toTransferAccount: null,
        },
      }),
      React.createElement('div', { 'data-testid': 'accounts-order' }, accounts.map((item) => item.name).join('|')),
    );
  }

  render(React.createElement(Wrapper));
  fireEvent.click(screen.getByRole('button', { name: 'Счета' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Опустить счёт ниже' })[0]);
  assert.equal(screen.getByTestId('accounts-order').textContent, 'Отпуск|Основной счёт|Резерв');
  resetDom();
});

addTest('AccountsSection smoke renders accounts and transfer summary', async () => {
  const { AccountsSection } = await loadUiModules();
  const copy = getCopy('en');
  const storeState = {
    accounts: [
      { id: 'card', name: 'Card', balance: toMinorUnits(40000), includeInSpendable: true, isSystem: true },
      { id: 'safety', name: 'Safety jar', balance: toMinorUnits(10000), includeInSpendable: false, isSystem: true },
    ],
  };
  const html = renderHtml(
    React.createElement(AccountsSection, {
      copy,
      store: storeState,
      theme: baseTheme,
      shell: {
        softPanelStyle,
        selectFieldStyle,
        selectOptionStyle,
        fmt: (value) => formatMinorAsCurrency(value, 'en-US'),
        locale: 'en-US',
      },
      storage: {
        storageLabels: baseStorageLabels,
        storageForm: {
          liquidPrimaryName: 'Card',
          liquidSecondaryName: '',
          liquidPrimaryPercent: '100',
          liquidSecondaryPercent: '0',
          safetyName: 'Safety jar',
          capitalName: 'Capital jar',
        },
        handleStorageInput: noop,
        formatInput: (value) => value,
        storageSplitTotal: 100,
        previewStorageItems: [{ label: 'Card', value: toMinorUnits(1000) }],
        saveStorageSettings: noop,
      },
      activity: {
        transferTransactions: [],
        reverseTransfer: noop,
        canReverseTransfer: () => false,
        selectedAccount: storeState.accounts[0],
        setSelectedAccountActivityId: noop,
        accountActivityTransactions: [],
        canDeleteTransaction: () => false,
        deleteTransaction: noop,
      },
      accountCreation: {
        accountForm: { name: '', amount: '', includeInSpendable: true },
        setAccountForm: noop,
        addCustomAccount: noop,
      },
      transfer: {
        transferForm: { fromId: '', toId: '', amount: '' },
        setTransferForm: noop,
        submitTransfer: noop,
        canSubmitTransfer: false,
        transferAmountValue: 0,
        isTransferAmountValid: false,
        fromTransferAccount: null,
        toTransferAccount: null,
      },
    }),
  );

  assert.match(html, /Transfer/);
  assert.match(html, /Storage/);
  assert.match(html, /Accounts/);
});

addTest('accounts overview offers rename and close only for custom accounts', async () => {
  resetDom();
  const { AccountsOverviewPanel } = await loadUiModules();
  const copy = getCopy('ru');

  render(
    React.createElement(AccountsOverviewPanel, {
      theme: baseTheme,
      store: {
        accounts: [
          {
            id: 'sys-capital',
            name: 'Капитал',
            balance: toMinorUnits(50000),
            isPrimary: false,
            isSystem: true,
            systemKey: 'capital',
            includeInSpendable: false,
          },
          {
            id: 'custom-1',
            name: 'Копилка',
            balance: toMinorUnits(3000),
            isPrimary: true,
            isSystem: false,
            systemKey: null,
            includeInSpendable: true,
          },
        ],
      },
      text: copy.accountsSection,
      softPanelStyle,
      locale: 'ru-RU',
      fmt: (value) => formatMinorAsCurrency(value, 'ru-RU', 'RUB'),
      recentTransfers: [],
      hasMoreTransfers: false,
      showMoreLabel: 'Показать ещё',
      onShowMoreTransfers: noop,
      reverseTransfer: noop,
      canReverseTransfer: () => false,
    }),
  );

  // One custom account means exactly one rename and one close control; the
  // system account must expose neither.
  assert.equal(screen.getAllByLabelText('Переименовать счёт').length, 1);
  assert.equal(screen.getAllByLabelText('Закрыть счёт').length, 1);
  resetDom();
});
