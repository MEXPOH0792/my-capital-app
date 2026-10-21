import DeltaBadge from './DeltaBadge.jsx';

export default function ReportMetricCard({ label, value, hint, theme, delta, polarity, isEnglish, fullWidth = false }) {
  return (
    <div
      className={`min-w-0 rounded-[16px] border px-3 py-2.5 ${fullWidth ? 'md:col-span-2' : ''}`.trim()}
      style={{
        backgroundColor: theme.surfaceSoft,
        borderColor: theme.border,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[10px] font-semibold opacity-55">{label}</p>
        <DeltaBadge delta={delta} polarity={polarity} isEnglish={isEnglish} />
      </div>
      <p className="mt-1 min-w-0 font-numbers font-extrabold tabular-nums leading-none tracking-[-0.035em] [overflow-wrap:anywhere] text-[clamp(0.92rem,4.6vw,1.08rem)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[10px] leading-[1.3] opacity-55">{hint}</p> : null}
    </div>
  );
}
