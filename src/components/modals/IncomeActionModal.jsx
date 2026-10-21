import {
  AmountInput,
  CategorySection,
  IncomeDistributionSection,
  ModalTitle,
  SubmitButton,
} from './TransactionModalShared.jsx';

export default function IncomeActionModal(props) {
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
    removeIncomePreset,
    softPanelStyle,
    allocationModes,
    store,
    handleAction,
    canSubmitAction,
    isModalAmountValid,
    modalHelperText,
  } = props;
  // The income sheet stays compact: a hint appears only when what was typed
  // cannot be saved (e.g. above the amount ceiling).
  const showInputError = String(inputValue ?? '').trim() !== '' && !isModalAmountValid && modalHelperText;

  return (
    <div className="space-y-3">
      <ModalTitle copy={copy} modal={modal} />
      <AmountInput inputValue={inputValue} setInputValue={setInputValue} formatInput={formatInput} />
      {showInputError ? (
        <p className="text-center text-[10px] leading-[1.35] text-[var(--mc-negative)]">{modalHelperText}</p>
      ) : null}
      <CategorySection
        modal={modal}
        isEnglish={isEnglish}
        activeTransactionCategoryPresets={activeTransactionCategoryPresets}
        transactionCategoryForm={transactionCategoryForm}
        setTransactionCategoryForm={setTransactionCategoryForm}
        removeIncomePreset={removeIncomePreset}
        softPanelStyle={softPanelStyle}
      />
      <IncomeDistributionSection
        allocationModes={allocationModes}
        store={store}
        copy={copy}
        isEnglish={isEnglish}
        softPanelStyle={softPanelStyle}
      />
      <SubmitButton copy={copy} handleAction={handleAction} canSubmitAction={canSubmitAction} />
    </div>
  );
}
