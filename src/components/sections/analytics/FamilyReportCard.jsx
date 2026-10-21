import { useMemo, useState } from 'react';
import { SectionCard, SectionHeader } from '../../ui/primitives.jsx';
import { formatMonthLabel, getFamilyMonthView, getMonthlyExpenseSummary } from '../../../domain/family.js';

/** Months worth offering: everything the partner sent plus the last few of mine. */
const buildMonthOptions = (reports, now) => {
  const months = new Set(reports.map((item) => item.monthKey));
  for (let back = 0; back < 3; back += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1);
    months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return [...months].sort((a, b) => b.localeCompare(a)).slice(0, 12);
};

/**
 * The combined month: what the two of you spent together, who spent it and on
 * what. The partner's figures come from the report file they sent and never
 * touch the user's accounts.
 */
export default function FamilyReportCard({ store, theme, softPanelStyle, isEnglish, locale, fmt }) {
  const reports = useMemo(() => store.familyReports || [], [store.familyReports]);
  const member = store.familyMember;
  // Clock read stays inside the memo: the list only changes with the data.
  const monthOptions = useMemo(() => buildMonthOptions(reports, new Date()), [reports]);
  const [monthKey, setMonthKey] = useState(() => reports[0]?.monthKey || monthOptions[0]);

  const activeMonth = monthOptions.includes(monthKey) ? monthKey : monthOptions[0];
  const view = useMemo(() => {
    const mine = getMonthlyExpenseSummary(store.transactions, activeMonth);
    const partner = reports.find((item) => item.monthKey === activeMonth) || null;
    return getFamilyMonthView(mine, partner);
  }, [store.transactions, reports, activeMonth]);

  const partnerName = member?.name || (isEnglish ? 'Partner' : 'Партнёр');
  const activeReport = reports.find((item) => item.monthKey === activeMonth) || null;
  const partnerPercent = view.minePercent === null ? null : 100 - view.minePercent;

  return (
    <SectionCard theme={theme} className="space-y-3 p-3.5">
      <SectionHeader
        eyebrow={isEnglish ? 'Family' : 'Семья'}
        title={isEnglish ? 'Spent together' : 'Потрачено вместе'}
        description={
          isEnglish
            ? 'Your spending plus what your partner sent. Balances stay separate.'
            : 'Твои расходы плюс то, что прислал партнёр. Счета остаются раздельными.'
        }
        compact
      />

      <div className="flex flex-wrap gap-1.5">
        {monthOptions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMonthKey(item)}
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-all active:scale-[0.99] ${
              item === activeMonth
                ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                : 'border-transparent bg-[var(--mc-soft)] opacity-70'
            }`}
          >
            {formatMonthLabel(item, locale)}
          </button>
        ))}
      </div>

      <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
        <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'Total spent' : 'Общий расход'}</p>
        <p className="mt-1 text-[clamp(1.4rem,8vw,1.9rem)] font-numbers font-extrabold leading-[1] [overflow-wrap:anywhere]">
          {fmt(view.total)}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2" style={{ borderColor: theme.border }}>
          <div>
            <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'You' : 'Ты'}</p>
            <p className="mt-0.5 text-[13px] font-numbers font-extrabold [overflow-wrap:anywhere]">
              {fmt(view.mineTotal)}
            </p>
            {view.minePercent !== null ? <p className="text-[10px] opacity-50">{view.minePercent}%</p> : null}
          </div>
          <div className="text-right">
            <p className="truncate text-[10px] font-semibold opacity-55">{partnerName}</p>
            <p className="mt-0.5 text-[13px] font-numbers font-extrabold [overflow-wrap:anywhere]">
              {fmt(view.partnerTotal)}
            </p>
            {partnerPercent !== null ? <p className="text-[10px] opacity-50">{partnerPercent}%</p> : null}
          </div>
        </div>
      </div>

      {view.partnerMissing ? (
        <p className="text-[11px] leading-[1.4] text-[var(--mc-warning)]">
          {isEnglish
            ? `${partnerName} has not shared ${formatMonthLabel(activeMonth, locale)} yet — the total shows your spending only.`
            : `${partnerName} ещё не присылал(а) отчёт за ${formatMonthLabel(activeMonth, locale).toLowerCase()} — в общей сумме только твои расходы.`}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'By category' : 'По категориям'}</p>
        {view.categories.length === 0 ? (
          <p className="text-[11px] opacity-55">
            {isEnglish ? 'No spending in this month.' : 'В этом месяце расходов нет.'}
          </p>
        ) : (
          view.categories.map((row) => (
            <div key={row.category} className="rounded-[14px] border px-3 py-2" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[12px] font-bold">{row.category}</p>
                <span className="shrink-0 text-[12px] font-numbers font-black [overflow-wrap:anywhere]">
                  {fmt(row.total)}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] opacity-50">
                {isEnglish ? 'You' : 'Ты'} {fmt(row.mine)} · {partnerName} {fmt(row.partner)}
              </p>
            </div>
          ))
        )}
      </div>

      {activeReport ? (
        <p className="text-[10px] leading-[1.35] opacity-45">
          {isEnglish
            ? `${partnerName}'s figures for ${formatMonthLabel(activeMonth, locale)}, received ${new Date(
                activeReport.importedAt,
              ).toLocaleDateString(locale)}.`
            : `Данные «${partnerName}» за ${formatMonthLabel(activeMonth, locale).toLowerCase()}, получены ${new Date(
                activeReport.importedAt,
              ).toLocaleDateString(locale)}.`}
        </p>
      ) : null}
    </SectionCard>
  );
}
