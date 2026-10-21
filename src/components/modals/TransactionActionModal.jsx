import IncomeActionModal from './IncomeActionModal.jsx';
import ExpenseActionModal from './ExpenseActionModal.jsx';
import PayDebtActionModal from './PayDebtActionModal.jsx';
import BalanceTargetModal from './BalanceTargetModal.jsx';

export default function TransactionActionModal(props) {
  const { modal } = props;

  if (modal === 'expense' || modal === 'edit_expense') {
    return <ExpenseActionModal {...props} />;
  }

  if (modal === 'income' || modal === 'edit_income') {
    return <IncomeActionModal {...props} />;
  }

  if (modal === 'pay_debt') {
    return <PayDebtActionModal {...props} />;
  }

  return <BalanceTargetModal {...props} />;
}
