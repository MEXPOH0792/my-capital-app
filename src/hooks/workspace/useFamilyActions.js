import {
  FamilyReportError,
  buildFamilyReportFile,
  formatMonthLabel,
  getMonthlyExpenseSummary,
  parseFamilyReportFile,
} from '../../domain/family.js';
import { getOrCreateFamilySenderId } from '../../utils/secureBridgeStorage.js';
import { readFileAsText } from './backupFile.js';
import { shareGeneratedFile } from './shareFile.js';

const importProblemText = (code, isEnglish, detail) => {
  if (code === 'currency_mismatch') {
    return isEnglish
      ? `The report is in ${detail.fileCurrency}, your app is in ${detail.currency}. These cannot be added up.`
      : `Отчёт в ${detail.fileCurrency}, а у тебя ${detail.currency}. Сложить их нельзя.`;
  }
  if (code === 'newer_version') {
    return isEnglish
      ? 'This report was made by a newer version of the app. Update it first.'
      : 'Этот отчёт сделан более новой версией приложения. Сначала обнови его.';
  }
  return isEnglish ? 'This is not a family report.' : 'Это не семейный отчёт.';
};

/**
 * Family budget: sending your own month of spending, and taking in the
 * partner's. Money never crosses over — the import only stores figures for the
 * report screen.
 */
export function useFamilyActions({ store, isEnglish, locale, fmt, setFamilyNotice }) {
  const shareMonthlyExpenses = async (monthKey) => {
    const summary = getMonthlyExpenseSummary(store.transactions, monthKey);
    if (summary.expensesTotal <= 0) {
      setFamilyNotice(isEnglish ? 'No spending recorded for that month.' : 'За этот месяц расходов не записано.');
      return;
    }

    const senderName =
      store.familySenderName ||
      (typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt(isEnglish ? 'Your name for the report' : 'Твоё имя в отчёте', '')
        : '');
    const safeName = String(senderName || '').trim();
    if (!safeName) return;
    if (safeName !== store.familySenderName) store.setFamilySenderName(safeName);

    const file = buildFamilyReportFile({
      senderId: getOrCreateFamilySenderId(),
      senderName: safeName,
      currency: store.currency,
      summary,
    });
    const monthLabel = formatMonthLabel(monthKey, locale);

    const outcome = await shareGeneratedFile({
      filename: `my-capital-family-${monthKey}.mcfamily`,
      content: JSON.stringify(file, null, 2),
      shareTitle: isEnglish ? `Spending for ${monthLabel}` : `Расходы за ${monthLabel.toLowerCase()}`,
      shareText: isEnglish
        ? `${monthLabel}: ${fmt(summary.expensesTotal)}`
        : `${monthLabel}: ${fmt(summary.expensesTotal)}`,
      dialogTitle: isEnglish ? 'Send spending report' : 'Отправить отчёт о расходах',
    });
    if (outcome === 'cancelled') return;

    setFamilyNotice(
      outcome === 'shared'
        ? isEnglish
          ? 'Report sent.'
          : 'Отчёт отправлен.'
        : isEnglish
          ? 'Report saved as a file.'
          : 'Отчёт сохранён файлом.',
    );
  };

  const importPartnerReport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const parsed = parseFamilyReportFile(JSON.parse(text), store.currency);
      const monthLabel = formatMonthLabel(parsed.monthKey, locale);
      const existing = store.familyReports.find((item) => item.monthKey === parsed.monthKey);

      if (existing) {
        const replace = window.confirm(
          isEnglish
            ? `A report for ${monthLabel} already exists (${fmt(existing.expensesTotal)}). Replace it with ${fmt(parsed.expensesTotal)}?`
            : `Отчёт за ${monthLabel.toLowerCase()} уже есть (${fmt(existing.expensesTotal)}). Заменить на ${fmt(parsed.expensesTotal)}?`,
        );
        if (!replace) return;
      }

      try {
        store.importFamilyReport(parsed);
      } catch (error) {
        if (error?.code !== 'other_device') throw error;
        const accept = window.confirm(
          isEnglish
            ? 'This report comes from a different device than before. Add it anyway?'
            : 'Этот отчёт пришёл с другого устройства, не с того, что раньше. Всё равно добавить?',
        );
        if (!accept) return;
        store.importFamilyReport(parsed, { acceptForeign: true });
      }

      setFamilyNotice(
        isEnglish
          ? `Added: ${monthLabel}, ${fmt(parsed.expensesTotal)}.`
          : `Добавлено: ${monthLabel.toLowerCase()}, ${fmt(parsed.expensesTotal)}.`,
      );
    } catch (error) {
      if (error instanceof FamilyReportError) {
        setFamilyNotice(
          importProblemText(error.code, isEnglish, {
            currency: error.detail?.currency || store.currency,
            fileCurrency: error.detail?.fileCurrency || '',
          }),
        );
        return;
      }
      setFamilyNotice(isEnglish ? 'This is not a family report.' : 'Это не семейный отчёт.');
    }
  };

  const removePartnerReport = (monthKey) => {
    const monthLabel = formatMonthLabel(monthKey, locale);
    const confirmed = window.confirm(
      isEnglish ? `Remove the report for ${monthLabel}?` : `Удалить отчёт за ${monthLabel.toLowerCase()}?`,
    );
    if (!confirmed) return;
    store.removeFamilyReport(monthKey);
  };

  const removePartner = () => {
    const confirmed = window.confirm(
      isEnglish ? 'Remove the partner and all their reports?' : 'Удалить участника и все его отчёты?',
    );
    if (!confirmed) return;
    store.removeFamilyMember();
    setFamilyNotice('');
  };

  return { shareMonthlyExpenses, importPartnerReport, removePartnerReport, removePartner };
}
