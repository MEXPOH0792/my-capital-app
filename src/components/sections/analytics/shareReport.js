import { buildReportText } from '../../../domain/finance.js';
import { shareOrCopyText } from '../../../utils/shareText.js';

/** How many spending categories the shared note lists before it gets unwieldy. */
const SHARED_CATEGORY_LIMIT = 10;

/**
 * Builds the plain-text report and hands it to the platform.
 *
 * Only ever called from an explicit tap. Returns the message to show, so the
 * confirmation matches what actually happened rather than claiming a share
 * that never opened.
 */
export const shareReport = async ({ report, periodLabel, fmt, isEnglish }) => {
  const title = isEnglish ? `My Capital — report (${periodLabel})` : `Личный Капитал — отчёт (${periodLabel})`;

  const summaryRows = [
    { label: isEnglish ? 'Income' : 'Доходы', value: fmt(report.incomeTotal) },
    { label: isEnglish ? 'Tracked expenses' : 'Отслеживаемые расходы', value: fmt(report.totalTrackedExpenses) },
  ];

  if (report.periodSummary) {
    summaryRows.push({ label: isEnglish ? 'Kept' : 'Сохранено', value: fmt(report.periodSummary.saved) });
    if (report.periodSummary.savingsRate !== null) {
      summaryRows.push({
        label: isEnglish ? 'Savings rate' : 'Норма сбережений',
        value: `${report.periodSummary.savingsRate}%`,
      });
    }
  }

  const text = buildReportText(title, [
    { heading: isEnglish ? 'Summary' : 'Итог', rows: summaryRows },
    {
      heading: isEnglish ? 'By category' : 'По категориям',
      rows: report.expenseCategories
        .slice(0, SHARED_CATEGORY_LIMIT)
        .map((item) => ({ label: item.category, value: fmt(item.amount) })),
    },
    {
      heading: isEnglish ? 'By account' : 'По счетам',
      rows: report.accountSpending.map((item) => ({ label: item.category, value: fmt(item.amount) })),
    },
  ]);

  try {
    const outcome = await shareOrCopyText(title, text);
    return outcome === 'shared'
      ? isEnglish
        ? 'Report sent to the share sheet.'
        : 'Отчёт отправлен в меню «Поделиться».'
      : isEnglish
        ? 'Report copied to the clipboard.'
        : 'Отчёт скопирован в буфер обмена.';
  } catch {
    return isEnglish ? 'Could not share the report.' : 'Не удалось поделиться отчётом.';
  }
};
