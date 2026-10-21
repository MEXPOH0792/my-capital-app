import { memo, useMemo, useState } from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import StorageSetupPanel from './accounts/StorageSetupPanel.jsx';
import AccountsOverviewPanel from './accounts/AccountsOverviewPanel.jsx';
import AccountActivityPanel from './accounts/AccountActivityPanel.jsx';
import AccountCreationPanel from './accounts/AccountCreationPanel.jsx';
import TransferPanel from './accounts/TransferPanel.jsx';

const INITIAL_VISIBLE_TRANSFERS = 5;
const INITIAL_VISIBLE_ACTIVITY = 6;
const LIST_PAGE_SIZE = 10;

function AccountsSection({ copy, store, theme, shell, storage, activity, accountCreation, transfer }) {
  const [visibleTransfers, setVisibleTransfers] = useState(INITIAL_VISIBLE_TRANSFERS);
  const [visibleActivity, setVisibleActivity] = useState(INITIAL_VISIBLE_ACTIVITY);
  const [activePanel, setActivePanel] = useState('overview');
  const text = copy.accountsSection;
  const { softPanelStyle, selectFieldStyle, selectOptionStyle, fmt, locale } = shell;
  const isEnglish = locale?.startsWith('en');
  const showMoreLabel = isEnglish ? 'Show more' : 'Показать ещё';
  const panelTabs = [
    { id: 'overview', label: isEnglish ? 'Accounts' : 'Счета' },
    { id: 'activity', label: isEnglish ? 'Activity' : 'Активность' },
    { id: 'storage', label: isEnglish ? 'Storage' : 'Хранение' },
  ];

  // Collapse both lists back to their first page when the underlying data
  // changes. Adjusting state during render is React's documented alternative
  // to a reset effect: it re-renders before committing, so a stale page size
  // is never painted.
  const listKey = `${activity.transferTransactions.length}|${activity.selectedAccount?.id || ''}|${activity.accountActivityTransactions.length}`;
  const [lastListKey, setLastListKey] = useState(listKey);
  if (listKey !== lastListKey) {
    setLastListKey(listKey);
    setVisibleTransfers(INITIAL_VISIBLE_TRANSFERS);
    setVisibleActivity(INITIAL_VISIBLE_ACTIVITY);
  }

  const recentTransfers = useMemo(
    () => activity.transferTransactions.slice(0, visibleTransfers),
    [activity.transferTransactions, visibleTransfers],
  );
  const visibleAccountActivity = useMemo(
    () => activity.accountActivityTransactions.slice(0, visibleActivity),
    [activity.accountActivityTransactions, visibleActivity],
  );
  const hasMoreTransfers = activity.transferTransactions.length > recentTransfers.length;
  const hasMoreActivity = activity.accountActivityTransactions.length > visibleAccountActivity.length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActivePanel('transfer')}
          className={`flex items-center justify-center gap-2 rounded-[16px] border px-3 py-2 text-[10px] font-semibold transition-all active:scale-[0.99] ${
            activePanel === 'transfer'
              ? 'border-emerald-500 bg-emerald-500/12 text-[var(--mc-positive)]'
              : 'text-[var(--mc-positive)]'
          }`}
          style={{
            backgroundColor: activePanel === 'transfer' ? undefined : theme.surfaceSoft,
            borderColor: activePanel === 'transfer' ? undefined : theme.border,
          }}
        >
          <ArrowLeftRight size={14} />
          <span>{isEnglish ? 'Transfer' : 'Перевод'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePanel('create')}
          className={`flex items-center justify-center gap-2 rounded-[16px] border px-3 py-2 text-[10px] font-semibold transition-all active:scale-[0.99] ${
            activePanel === 'create'
              ? 'border-emerald-500 bg-emerald-500/12 text-[var(--mc-positive)]'
              : 'text-[var(--mc-positive)]'
          }`}
          style={{
            backgroundColor: activePanel === 'create' ? undefined : theme.surfaceSoft,
            borderColor: activePanel === 'create' ? undefined : theme.border,
          }}
        >
          <Plus size={14} />
          <span>{isEnglish ? 'New account' : 'Новый счёт'}</span>
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {panelTabs.map((tab) => {
          const active = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePanel(tab.id)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all active:scale-[0.99] ${
                active
                  ? 'border-emerald-500 bg-emerald-500/12 text-[var(--mc-positive)] shadow-[0_0_0_1px_rgba(16,185,129,0.08)]'
                  : 'border-transparent bg-[var(--mc-soft)] opacity-70'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activePanel === 'overview' ? (
        <AccountsOverviewPanel
          theme={theme}
          store={store}
          text={text}
          softPanelStyle={softPanelStyle}
          locale={locale}
          fmt={fmt}
          recentTransfers={recentTransfers}
          hasMoreTransfers={hasMoreTransfers}
          showMoreLabel={showMoreLabel}
          onShowMoreTransfers={() => setVisibleTransfers((count) => count + LIST_PAGE_SIZE)}
          reverseTransfer={activity.reverseTransfer}
          canReverseTransfer={activity.canReverseTransfer}
        />
      ) : null}

      {activePanel === 'activity' ? (
        <AccountActivityPanel
          theme={theme}
          text={text}
          softPanelStyle={softPanelStyle}
          locale={locale}
          fmt={fmt}
          store={store}
          selectedAccount={activity.selectedAccount}
          setSelectedAccountActivityId={activity.setSelectedAccountActivityId}
          visibleAccountActivity={visibleAccountActivity}
          hasMoreActivity={hasMoreActivity}
          showMoreLabel={showMoreLabel}
          onShowMoreActivity={() => setVisibleActivity((count) => count + LIST_PAGE_SIZE)}
          canDeleteTransaction={activity.canDeleteTransaction}
          deleteTransaction={activity.deleteTransaction}
          reverseTransfer={activity.reverseTransfer}
          canReverseTransfer={activity.canReverseTransfer}
        />
      ) : null}

      {activePanel === 'storage' ? (
        <StorageSetupPanel
          theme={theme}
          store={store}
          text={text}
          softPanelStyle={softPanelStyle}
          fmt={fmt}
          storageLabels={storage.storageLabels}
          storageForm={storage.storageForm}
          storageNotice={storage.storageNotice}
          handleStorageInput={storage.handleStorageInput}
          previewStorageItems={storage.previewStorageItems}
          saveStorageSettings={storage.saveStorageSettings}
          isEnglish={isEnglish}
        />
      ) : null}

      {activePanel === 'transfer' ? (
        <TransferPanel
          theme={theme}
          store={store}
          text={text}
          copy={copy}
          softPanelStyle={softPanelStyle}
          selectFieldStyle={selectFieldStyle}
          selectOptionStyle={selectOptionStyle}
          fmt={fmt}
          formatInput={storage.formatInput}
          transferForm={transfer.transferForm}
          setTransferForm={transfer.setTransferForm}
          submitTransfer={transfer.submitTransfer}
          canSubmitTransfer={transfer.canSubmitTransfer}
          transferAmountValue={transfer.transferAmountValue}
          fromTransferAccount={transfer.fromTransferAccount}
          toTransferAccount={transfer.toTransferAccount}
        />
      ) : null}

      {activePanel === 'create' ? (
        <AccountCreationPanel
          theme={theme}
          text={text}
          copy={copy}
          softPanelStyle={softPanelStyle}
          accountForm={accountCreation.accountForm}
          setAccountForm={accountCreation.setAccountForm}
          addCustomAccount={accountCreation.addCustomAccount}
        />
      ) : null}
    </div>
  );
}

export default memo(AccountsSection);
