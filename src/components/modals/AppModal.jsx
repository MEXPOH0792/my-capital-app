import ModalShell from './ModalShell.jsx';
import TransactionActionModal from './TransactionActionModal.jsx';
import HistoryTransactionModal from './HistoryTransactionModal.jsx';
import NewDebtModal from './NewDebtModal.jsx';

const TRANSACTION_MODALS = new Set([
  'income',
  'edit_income',
  'expense',
  'edit_expense',
  'pay_debt',
  'edit_balance',
  'set_target_capital',
  'set_target_safety',
]);

const CENTERED_DIALOG_MODALS = new Set([
  'edit_balance',
  'set_target_capital',
  'set_target_safety',
  'pay_debt',
  'history_transaction',
]);

export default function AppModal(props) {
  const { modal, setModal, isDarkMode, theme, panelStyle } = props;

  if (!modal) return null;

  return (
    <ModalShell
      isDarkMode={isDarkMode}
      theme={theme}
      panelStyle={panelStyle}
      setModal={setModal}
      layout={CENTERED_DIALOG_MODALS.has(modal) ? 'dialog' : 'sheet'}
    >
      {TRANSACTION_MODALS.has(modal) ? <TransactionActionModal {...props} /> : null}
      {modal === 'history_transaction' ? <HistoryTransactionModal {...props} /> : null}
      {modal === 'new_debt' || modal === 'edit_debt' ? <NewDebtModal {...props} /> : null}
    </ModalShell>
  );
}
