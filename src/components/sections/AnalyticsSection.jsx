import { memo, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, Share2, TrendingUp, Users } from 'lucide-react';
import { SectionCard, SectionHeader } from '../ui/primitives.jsx';
import MonthlyBars from '../ui/MonthlyBars.jsx';
import { getMonthKey, getPreviousMonthKey } from '../../domain/family.js';
import CategoryBreakdown from './analytics/CategoryBreakdown.jsx';
import ReportMetricCard from './analytics/ReportMetricCard.jsx';
import SavingsCard from './analytics/SavingsCard.jsx';
import FamilyReportCard from './analytics/FamilyReportCard.jsx';
import { getRiseNote, getTrendNote } from './analytics/reportNotes.js';
import { shareReport } from './analytics/shareReport.js';

const EMPTY_REPORT = {
  incomeTotal: 0,
  transactionCount: 0,
  totalTrackedExpenses: 0,
  sadakaSetAside: 0,
  expenseCategories: [],
  incomeCategories: [],
  accountSpending: [],
  topExpenseCategory: null,
  topExpenseShare: 0,
  expenseHeadline: '',
  expenseInsight: '',
  periodSummary: null,
  periodComparison: null,
  monthly: null,
  goalPace: null,
};

function AnalyticsSection({
  theme,
  store,
  isEnglish,
  analyticsRange,
  setAnalyticsRange,
  report,
  softPanelStyle,
  fmt,
  locale = 'ru-RU',
  shareMonthlyExpenses,
  familyNotice,
}) {
  const [shareNotice, setShareNotice] = useState('');
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [viewMode, setViewMode] = useState('mine');
  const data = { ...EMPTY_REPORT, ...(report || {}) };
  // The family tab only makes sense once a partner has actually sent a month.
  const hasFamily = Boolean(store.familyMember && (store.familyReports || []).length > 0);
  const isFamilyView = hasFamily && viewMode === 'family';
  const sendMonths = useMemo(() => {
    const thisMonth = getMonthKey(new Date());
    return [getPreviousMonthKey(thisMonth), thisMonth];
  }, []);

  const periodOptions = [
    { key: '30d', label: isEnglish ? '30 days' : '30 дней' },
    { key: '90d', label: isEnglish ? '90 days' : '90 дней' },
    { key: 'all', label: isEnglish ? 'All time' : 'Всё время' },
    { key: 'custom', label: isEnglish ? 'Period' : 'Период' },
  ];

  const metrics = useMemo(() => {
    const items = [
      {
        label: isEnglish ? 'Income' : 'Доходы',
        value: fmt(data.incomeTotal),
        hint: isEnglish ? `${data.transactionCount} entries` : `${data.transactionCount} операций`,
        delta: data.periodComparison?.income,
        polarity: 'goodUp',
      },
      {
        label: isEnglish ? 'Tracked expenses' : 'Отслеживаемые расходы',
        value: fmt(data.totalTrackedExpenses),
        hint: isEnglish ? 'Only for context' : 'Только для контекста',
        delta: data.periodComparison?.expenses,
        polarity: 'goodDown',
      },
      // The sadaka share stays on its own account: set aside, not spent.
      ...(data.sadakaSetAside > 0
        ? [
            {
              label: isEnglish ? 'Set aside for sadaka' : 'Отложено на садаку',
              value: fmt(data.sadakaSetAside),
              hint: isEnglish ? 'Not counted as spending' : 'Не считается тратой',
            },
          ]
        : []),
      // "Free" and "Capital" are snapshots of right now, not period totals, so
      // comparing them against a past window would be meaningless.
      { label: isEnglish ? 'Free' : 'Свободно', value: fmt(store.availableBalance) },
      { label: isEnglish ? 'Capital' : 'Капитал', value: fmt(store.capital) },
    ];

    return items.map((item) => ({ ...item, fullWidth: item.value.length > 12 }));
  }, [
    data.incomeTotal,
    data.transactionCount,
    data.totalTrackedExpenses,
    data.sadakaSetAside,
    data.periodComparison,
    fmt,
    isEnglish,
    store.availableBalance,
    store.capital,
  ]);

  const riseNote = getRiseNote(data.periodComparison?.biggestRise, fmt, isEnglish);
  const trendNote = getTrendNote(data.monthly?.trend, isEnglish);

  const handleShareReport = async () => {
    const periodLabel = periodOptions.find((item) => item.key === analyticsRange.preset)?.label || '';
    setShareNotice(await shareReport({ report: data, periodLabel, fmt, isEnglish }));
  };

  return (
    <div className="space-y-2.5 pt-2">
      <SectionCard theme={theme} className="space-y-2.5 p-3">
        <SectionHeader
          eyebrow={isEnglish ? 'Report' : 'Отчёт'}
          title={isEnglish ? 'What matters now' : 'Что важно сейчас'}
          description={
            isEnglish ? 'Only the signals that change the next step.' : 'Только сигналы, которые меняют следующий шаг.'
          }
          compact
        />

        {hasFamily ? (
          <div className="flex gap-1.5">
            {[
              { key: 'mine', label: isEnglish ? 'Mine' : 'Мои' },
              { key: 'family', label: isEnglish ? 'Family' : 'Семья' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setViewMode(item.key)}
                className={`flex-1 rounded-[12px] border py-2 text-[10px] font-semibold transition-all active:scale-[0.99] ${
                  viewMode === item.key
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                    : 'border-transparent bg-[var(--mc-soft)] opacity-70'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className={`flex-wrap gap-1.5 ${isFamilyView ? 'hidden' : 'flex'}`}>
          {periodOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setAnalyticsRange((prev) => ({ ...prev, preset: item.key }))}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-all active:scale-[0.99] ${
                analyticsRange.preset === item.key
                  ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                  : 'border-transparent bg-[var(--mc-soft)] opacity-70'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {analyticsRange.preset === 'custom' && !isFamilyView ? (
          <div className="grid grid-cols-1 gap-2">
            <input
              type="date"
              value={analyticsRange.from}
              onChange={(event) => setAnalyticsRange((prev) => ({ ...prev, from: event.target.value }))}
              className="w-full rounded-[16px] border px-4 py-2.5 text-sm font-bold outline-none"
              style={softPanelStyle}
            />
            <input
              type="date"
              value={analyticsRange.to}
              onChange={(event) => setAnalyticsRange((prev) => ({ ...prev, to: event.target.value }))}
              className="w-full rounded-[16px] border px-4 py-2.5 text-sm font-bold outline-none"
              style={softPanelStyle}
            />
          </div>
        ) : null}
      </SectionCard>

      {isFamilyView ? (
        <FamilyReportCard
          store={store}
          theme={theme}
          softPanelStyle={softPanelStyle}
          isEnglish={isEnglish}
          locale={locale}
          fmt={fmt}
        />
      ) : (
        <>
          <SavingsCard
            periodSummary={data.periodSummary}
            goalPace={data.goalPace}
            periodComparison={data.periodComparison}
            fmt={fmt}
            isEnglish={isEnglish}
            theme={theme}
            softPanelStyle={softPanelStyle}
          />

          <SectionCard theme={theme} className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'Main leak' : 'Главная утечка'}</p>
                <h3 className="mt-1 text-[14px] font-black leading-[1.28] [overflow-wrap:anywhere]">
                  {data.topExpenseCategory
                    ? data.topExpenseCategory.category
                    : isEnglish
                      ? 'Need more data'
                      : 'Нужно больше данных'}
                </h3>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/4 text-[var(--mc-negative)]">
                <AlertTriangle size={13} />
              </div>
            </div>

            <div className="rounded-[16px] border px-3 py-2.5 text-sm leading-[1.35]" style={softPanelStyle}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-[13px] font-bold leading-[1.35]">
                  {data.topExpenseCategory
                    ? data.expenseHeadline
                    : isEnglish
                      ? 'Add categorized expenses first.'
                      : 'Сначала добавь расходы с категориями.'}
                </p>
                {data.topExpenseCategory ? (
                  <span className="shrink-0 rounded-full border border-red-400/14 bg-red-500/5 px-2 py-1 text-[10px] font-semibold text-[var(--mc-negative)]">
                    {data.topExpenseShare}%
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-[10px] leading-[1.3] opacity-55">
                {data.topExpenseCategory
                  ? data.expenseInsight
                  : isEnglish
                    ? 'Without categories this screen stays decorative.'
                    : 'Без категорий этот экран остаётся декоративным.'}
              </p>
              {riseNote ? (
                <p className="mt-1.5 text-[10px] leading-[1.3] text-[var(--mc-negative)]">{riseNote}</p>
              ) : null}
            </div>
          </SectionCard>

          <CategoryBreakdown
            expenseCategories={data.expenseCategories}
            incomeCategories={data.incomeCategories}
            accountSpending={data.accountSpending}
            totalTrackedExpenses={data.totalTrackedExpenses}
            incomeTotal={data.incomeTotal}
            fmt={fmt}
            isEnglish={isEnglish}
            theme={theme}
          />

          {data.monthly?.series?.length ? (
            <SectionCard theme={theme} className="space-y-2.5 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="opacity-55" />
                <p className="text-[10px] font-semibold opacity-55">
                  {isEnglish ? 'Last 6 months' : 'Последние 6 месяцев'}
                </p>
              </div>

              <MonthlyBars
                series={data.monthly.series}
                fmt={fmt}
                isEnglish={isEnglish}
                locale={locale}
                softPanelStyle={softPanelStyle}
              />

              {trendNote ? <p className="text-[10px] leading-[1.3] opacity-55">{trendNote}</p> : null}
            </SectionCard>
          ) : null}

          <SectionCard theme={theme} className="space-y-2.5 p-3">
            <div className="flex items-center gap-2">
              <CalendarRange size={14} className="opacity-55" />
              <p className="text-[10px] font-semibold opacity-55">{isEnglish ? 'Context' : 'Контекст'}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {metrics.map((item) => (
                <ReportMetricCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  hint={item.hint}
                  theme={theme}
                  delta={item.delta}
                  polarity={item.polarity}
                  isEnglish={isEnglish}
                  fullWidth={item.fullWidth}
                />
              ))}
            </div>
          </SectionCard>
        </>
      )}

      <div className="space-y-1.5">
        <button
          type="button"
          onClick={handleShareReport}
          className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-[16px] border px-4 text-[11px] font-semibold transition-transform active:scale-[0.99]"
          style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        >
          <Share2 size={14} aria-hidden="true" />
          {isEnglish ? 'Share report' : 'Поделиться отчётом'}
        </button>
        <button
          type="button"
          onClick={() => setIsSendOpen((value) => !value)}
          aria-expanded={isSendOpen}
          className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-[16px] border px-4 text-[11px] font-semibold transition-transform active:scale-[0.99]"
          style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        >
          <Users size={14} aria-hidden="true" />
          {isEnglish ? 'Send my monthly spending' : 'Отправить расходы за месяц'}
        </button>

        {isSendOpen ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {sendMonths.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => shareMonthlyExpenses?.(month)}
                  className="rounded-[16px] border px-3 py-2 text-[10px] font-semibold transition-all active:scale-[0.99]"
                  style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                >
                  {index === 0 ? (isEnglish ? 'Last month' : 'Прошлый месяц') : isEnglish ? 'This month' : 'Этот месяц'}
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] leading-[1.35] opacity-55">
              {isEnglish
                ? 'The file holds your monthly total and categories. Send it only to someone you trust.'
                : 'В файле — твоя сумма расходов за месяц и категории. Отправляй только тому, кому доверяешь.'}
            </p>
          </>
        ) : null}

        {shareNotice || familyNotice ? (
          <p className="text-center text-[10px] leading-[1.3] opacity-55">{shareNotice || familyNotice}</p>
        ) : null}
      </div>
    </div>
  );
}

export default memo(AnalyticsSection);
