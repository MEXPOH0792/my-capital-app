import { parseMoneyInputToMinor } from '../../utils/money.js';
import { SpendAccountSection, scrollFieldIntoView } from './TransactionModalShared.jsx';

export default function NewDebtModal({
  copy,
  modal,
  debtForm,
  setDebtForm,
  formatInput,
  softPanelStyle,
  submitDebt,
  deleteSelectedDebt,
  isEnglish,
  selectedSpendAccountId,
  setSelectedSpendAccountId,
  selectFieldStyle,
  selectOptionStyle,
  spendableAccounts = [],
  fmt,
}) {
  const isEditMode = modal === 'edit_debt';
  // Lending takes money from an account; a loan added to the balance puts it
  // on one. Either way the user picks which.
  const movesMoney = !isEditMode && (debtForm.type === 'ASSET' || debtForm.addToBalance);
  const moneyAccount = spendableAccounts.find((item) => item.id === selectedSpendAccountId);
  const lendShortfall =
    !isEditMode && debtForm.type === 'ASSET' && moneyAccount
      ? parseMoneyInputToMinor(debtForm.amount) > moneyAccount.balance
      : false;
  const title = isEditMode
    ? copy.debts.editTitle || (isEnglish ? 'Edit debt' : 'Редактировать долг')
    : copy.debts.newDebtTitle;
  const amountLabel = isEditMode
    ? copy.debts.balanceLeft || (isEnglish ? 'Balance left' : 'Остаток')
    : copy.settings.amount;
  const submitLabel = isEditMode
    ? copy.debts.save || (isEnglish ? 'Save changes' : 'Сохранить изменения')
    : copy.debts.create;

  return (
    <div className="space-y-3">
      <h3 className="text-center text-[10px] font-semibold opacity-40">{title}</h3>

      {!isEditMode ? (
        <div className="flex rounded-[16px] border p-1" style={softPanelStyle}>
          <button
            type="button"
            onClick={() => setDebtForm({ ...debtForm, type: 'LIABILITY' })}
            className={`flex-1 rounded-[12px] py-2.5 text-[10px] font-semibold transition-all ${debtForm.type === 'LIABILITY' ? 'bg-red-500 text-white shadow-lg' : 'opacity-40'}`}
          >
            {copy.modal.iOwe}
          </button>
          <button
            type="button"
            onClick={() => setDebtForm({ ...debtForm, type: 'ASSET' })}
            className={`flex-1 rounded-[12px] py-2.5 text-[10px] font-semibold transition-all ${debtForm.type === 'ASSET' ? 'bg-green-500 text-white shadow-lg' : 'opacity-40'}`}
          >
            {copy.modal.owedToMe}
          </button>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="ml-2 text-[10px] font-semibold opacity-40">{copy.debts.info}</p>
        <input
          type="text"
          placeholder={copy.debts.titlePlaceholder}
          value={debtForm.title}
          onChange={(event) => setDebtForm({ ...debtForm, title: event.target.value })}
          onFocus={scrollFieldIntoView}
          className="w-full rounded-[16px] border px-4 py-3 text-[13px] font-bold outline-none"
          style={softPanelStyle}
        />
        <input
          type="text"
          placeholder={copy.debts.bankPlaceholder}
          value={debtForm.bankName}
          onChange={(event) => setDebtForm({ ...debtForm, bankName: event.target.value })}
          onFocus={scrollFieldIntoView}
          className="w-full rounded-[16px] border px-4 py-3 text-[13px] font-bold outline-none"
          style={softPanelStyle}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <p className="ml-2 text-[10px] font-semibold opacity-40">{amountLabel}</p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={debtForm.amount}
            onChange={(event) => setDebtForm({ ...debtForm, amount: formatInput(event.target.value) })}
            onFocus={scrollFieldIntoView}
            className="w-full rounded-[16px] border px-4 py-3 text-[16px] font-numbers font-extrabold outline-none"
            style={softPanelStyle}
          />
        </div>
        <div className="space-y-1.5">
          <p className="ml-2 text-[10px] font-semibold opacity-40">{copy.debts.ratePercent}</p>
          <input
            type="number"
            placeholder="%"
            value={debtForm.interestRate}
            onChange={(event) => setDebtForm({ ...debtForm, interestRate: event.target.value })}
            onFocus={scrollFieldIntoView}
            className="w-full rounded-[16px] border px-4 py-3 text-[16px] font-numbers font-extrabold outline-none"
            style={softPanelStyle}
          />
        </div>
      </div>

      {!isEditMode && debtForm.type === 'LIABILITY' ? (
        <label className="flex cursor-pointer items-center gap-2 px-2 py-1 opacity-55 transition-opacity hover:opacity-100">
          <input
            type="checkbox"
            checked={debtForm.addToBalance}
            onChange={(event) => setDebtForm({ ...debtForm, addToBalance: event.target.checked })}
            className="h-4 w-4 rounded accent-emerald-500"
          />
          <span className="text-[10px] font-semibold">{copy.debts.includeInBalance}</span>
        </label>
      ) : null}

      {movesMoney ? (
        <SpendAccountSection
          isEnglish={isEnglish}
          selectedSpendAccountId={selectedSpendAccountId}
          setSelectedSpendAccountId={setSelectedSpendAccountId}
          selectFieldStyle={selectFieldStyle}
          selectOptionStyle={selectOptionStyle}
          spendableAccounts={spendableAccounts}
          fmt={fmt}
          label={
            debtForm.type === 'ASSET'
              ? isEnglish
                ? 'Lend from account'
                : 'Выдать со счёта'
              : isEnglish
                ? 'Receive to account'
                : 'Зачислить на счёт'
          }
        />
      ) : null}

      {lendShortfall ? (
        <p className="text-center text-[10px] leading-[1.35] text-[var(--mc-negative)]">
          {isEnglish
            ? `Only ${fmt(moneyAccount.balance)} on this account.`
            : `На этом счёте только ${fmt(moneyAccount.balance)}.`}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submitDebt}
        disabled={lendShortfall}
        className="w-full rounded-[16px] bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 py-3 text-[10px] font-semibold text-white shadow-xl shadow-emerald-600/20 transition-transform active:scale-95"
      >
        {submitLabel}
      </button>

      {isEditMode ? (
        <button
          type="button"
          onClick={deleteSelectedDebt}
          className="w-full rounded-[16px] border border-red-500/30 py-3 text-[10px] font-semibold text-[var(--mc-negative)] transition-transform active:scale-95"
        >
          {copy.debts.delete || (isEnglish ? 'Delete debt' : 'Удалить долг')}
        </button>
      ) : null}
    </div>
  );
}
