import { AmountInput, ModalTitle, SubmitButton } from './TransactionModalShared.jsx';

export default function BalanceTargetModal(props) {
  const { modal, copy, inputValue, setInputValue, formatInput, handleAction, canSubmitAction, modalHelperText } = props;

  return (
    <div className="space-y-3">
      <ModalTitle copy={copy} modal={modal} />
      <AmountInput inputValue={inputValue} setInputValue={setInputValue} formatInput={formatInput} />
      {modalHelperText ? <p className="text-center text-[10px] leading-[1.35] opacity-55">{modalHelperText}</p> : null}
      <SubmitButton copy={copy} handleAction={handleAction} canSubmitAction={canSubmitAction} />
    </div>
  );
}
