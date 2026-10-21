import { AmountInput, ModalTitle, SpendAccountSection, SubmitButton } from './TransactionModalShared.jsx';

export default function PayDebtActionModal(props) {
  const {
    modal,
    copy,
    selectedDebt,
    inputValue,
    setInputValue,
    formatInput,
    isEnglish,
    selectedSpendAccountId,
    setSelectedSpendAccountId,
    selectFieldStyle,
    selectOptionStyle,
    spendableAccounts,
    fmt,
    modalHelperText,
    handleAction,
    canSubmitAction,
  } = props;

  return (
    <div className="space-y-3">
      <ModalTitle copy={copy} modal={modal} selectedDebt={selectedDebt} />
      <AmountInput inputValue={inputValue} setInputValue={setInputValue} formatInput={formatInput} />
      <SpendAccountSection
        isEnglish={isEnglish}
        selectedSpendAccountId={selectedSpendAccountId}
        setSelectedSpendAccountId={setSelectedSpendAccountId}
        selectFieldStyle={selectFieldStyle}
        selectOptionStyle={selectOptionStyle}
        spendableAccounts={spendableAccounts}
        fmt={fmt}
        label={selectedDebt?.type === 'ASSET' ? (isEnglish ? 'Receive to account' : 'Зачислить на счёт') : undefined}
      />
      {modalHelperText ? <p className="text-center text-[10px] leading-[1.35] opacity-55">{modalHelperText}</p> : null}
      <SubmitButton copy={copy} handleAction={handleAction} canSubmitAction={canSubmitAction} />
    </div>
  );
}
