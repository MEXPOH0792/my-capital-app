import {
  AmountInput,
  CategorySection,
  ModalTitle,
  SpendAccountSection,
  SubmitButton,
} from './TransactionModalShared.jsx';
import LimitWarning from './LimitWarning.jsx';
import VoiceExpenseControl, { VoiceExpenseStatus } from './VoiceExpenseControl.jsx';

export default function ExpenseActionModal(props) {
  const {
    modal,
    copy,
    inputValue,
    setInputValue,
    formatInput,
    isEnglish,
    activeTransactionCategoryPresets,
    transactionCategoryForm,
    setTransactionCategoryForm,
    removeExpensePreset,
    softPanelStyle,
    selectedSpendAccountId,
    setSelectedSpendAccountId,
    selectFieldStyle,
    selectOptionStyle,
    spendableAccounts,
    fmt,
    modalHelperText,
    limitForecast,
    handleAction,
    canSubmitAction,
    voiceExpense,
    startVoiceExpense,
    store,
  } = props;

  return (
    <div className="space-y-3">
      <div className="mc-modal-heading-row">
        <ModalTitle copy={copy} modal={modal} />
        {modal === 'expense' ? (
          <VoiceExpenseControl
            voiceExpense={voiceExpense}
            startVoiceExpense={startVoiceExpense}
            isEnglish={isEnglish}
          />
        ) : null}
      </div>
      <VoiceExpenseStatus voiceExpense={voiceExpense} isEnglish={isEnglish} />
      <AmountInput inputValue={inputValue} setInputValue={setInputValue} formatInput={formatInput} />
      <CategorySection
        modal={modal}
        isEnglish={isEnglish}
        activeTransactionCategoryPresets={activeTransactionCategoryPresets}
        transactionCategoryForm={transactionCategoryForm}
        setTransactionCategoryForm={setTransactionCategoryForm}
        removeExpensePreset={removeExpensePreset}
        softPanelStyle={softPanelStyle}
        transactions={store.transactions}
      />
      <SpendAccountSection
        isEnglish={isEnglish}
        selectedSpendAccountId={selectedSpendAccountId}
        setSelectedSpendAccountId={setSelectedSpendAccountId}
        selectFieldStyle={selectFieldStyle}
        selectOptionStyle={selectOptionStyle}
        spendableAccounts={spendableAccounts}
        fmt={fmt}
      />
      <LimitWarning forecast={limitForecast} fmt={fmt} isEnglish={isEnglish} />
      {modalHelperText ? <p className="text-center text-[10px] leading-[1.35] opacity-55">{modalHelperText}</p> : null}
      <SubmitButton copy={copy} handleAction={handleAction} canSubmitAction={canSubmitAction} />
    </div>
  );
}
