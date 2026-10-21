// Wording rules for the report, kept together so the copy decisions live in
// one place and stay testable.

export const SAVINGS_TONE_CLASS = {
  negative: 'text-[var(--mc-negative)] border-red-500/25 bg-red-500/10',
  thin: 'text-[var(--mc-warning)] border-amber-500/25 bg-amber-500/10',
  working: 'text-[var(--mc-positive)] border-emerald-500/25 bg-emerald-500/10',
  strong: 'text-[var(--mc-positive)] border-emerald-500/30 bg-emerald-500/15',
};

export const getSavingsVerdict = (tone, isEnglish) => {
  switch (tone) {
    case 'negative':
      return isEnglish
        ? 'The period closed at a loss — you spent more than you earned.'
        : 'Период закрыт в минус — потрачено больше, чем заработано.';
    case 'thin':
      return isEnglish
        ? 'Little is being kept. Any surprise will knock this pace off.'
        : 'Откладывается мало. Любая неожиданность собьёт темп.';
    case 'working':
      return isEnglish
        ? 'A working pace. Capital grows steadily like this.'
        : 'Рабочий темп. На нём капитал растёт устойчиво.';
    case 'strong':
      return isEnglish ? 'Strong pace. You can raise the goal.' : 'Сильный темп. Можно поднимать цель.';
    default:
      return '';
  }
};

export const getTrendNote = (trend, isEnglish) => {
  if (!trend || trend.kind === 'insufficient') return '';
  // A streak counts month-over-month moves, so the run covers one month more.
  const months = trend.streak + 1;
  // The chart spans at most six months, so this only ever sees 3..6.
  const monthWord = `месяц${months > 4 ? 'ев' : 'а'}`;

  switch (trend.kind) {
    case 'expenses-rising':
      return isEnglish
        ? `Spending has grown ${months} months in a row.`
        : `Расходы растут ${months} ${monthWord} подряд.`;
    case 'expenses-falling':
      return isEnglish
        ? `Spending has fallen ${months} months in a row.`
        : `Расходы падают ${months} ${monthWord} подряд.`;
    case 'income-rising':
      return isEnglish ? `Income has grown ${months} months in a row.` : `Доходы растут ${months} ${monthWord} подряд.`;
    case 'income-falling':
      return isEnglish
        ? `Income has fallen ${months} months in a row.`
        : `Доходы падают ${months} ${monthWord} подряд.`;
    default:
      return isEnglish ? 'No clear trend — the months hold steady.' : 'Явного тренда нет — месяцы держатся ровно.';
  }
};

export const getRiseNote = (rise, fmt, isEnglish) => {
  if (!rise) return '';

  // "категория" keeps the Russian verb agreement correct whatever the category
  // name is, so no per-category gender handling is needed.
  if (rise.percent === null) {
    return isEnglish
      ? `New spending category: ${rise.category} — ${fmt(rise.current)}.`
      : `Новая категория в тратах: «${rise.category}» — ${fmt(rise.current)}.`;
  }

  return isEnglish
    ? `Biggest riser: ${rise.category}, +${rise.percent}% (${fmt(rise.absolute)}).`
    : `Сильнее всего выросла категория «${rise.category}»: +${rise.percent}% (${fmt(rise.absolute)}).`;
};
