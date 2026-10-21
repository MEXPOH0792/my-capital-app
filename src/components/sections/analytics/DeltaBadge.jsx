/**
 * Direction badge against the previous period.
 *
 * Growth is not universally good or bad, so the caller declares the polarity:
 * income growing is green, spending growing is red. A zero base is shown as
 * "new" rather than a fabricated percentage.
 */
export default function DeltaBadge({ delta, polarity, isEnglish }) {
  if (!delta || delta.direction === 'none') return null;

  const isIncrease = delta.direction === 'up' || delta.direction === 'new';
  const isFlat = delta.direction === 'flat';
  const isGood = isIncrease ? polarity === 'goodUp' : polarity === 'goodDown';

  const toneClass = isFlat ? 'opacity-55' : isGood ? 'text-[var(--mc-positive)]' : 'text-[var(--mc-negative)]';
  const label = isFlat
    ? isEnglish
      ? 'same'
      : 'без изменений'
    : delta.direction === 'new'
      ? isEnglish
        ? 'new'
        : 'новое'
      : `${isIncrease ? '↑' : '↓'} ${Math.abs(delta.percent)}%`;

  return <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${toneClass}`}>{label}</span>;
}
