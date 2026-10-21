import { Percent } from 'lucide-react';

export function SectionCard({ theme, className = '', soft = false, tone = 'default', children }) {
  const toneStyles = {
    default: {
      backgroundColor: soft ? theme.surfaceSoft : theme.surface,
      borderColor: theme.border,
      boxShadow: soft ? 'none' : theme.panelShadow,
    },
    hero: {
      backgroundColor: soft ? theme.surfaceSoft : theme.surface,
      borderColor: theme.border,
      boxShadow: soft ? 'none' : theme.panelShadow,
    },
    utility: {
      backgroundColor: theme.surfaceSoft,
      borderColor: theme.border,
      boxShadow: 'none',
    },
    empty: {
      backgroundColor: theme.surfaceSoft,
      borderColor: theme.border,
      boxShadow: 'none',
    },
    destructive: {
      backgroundColor: 'rgba(239,68,68,0.05)',
      borderColor: 'rgba(239,68,68,0.16)',
      boxShadow: theme.panelShadow,
    },
  };

  return (
    <div
      className={`rounded-[22px] md:rounded-[22px] border ${className}`.trim()}
      style={toneStyles[tone] || toneStyles.default}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  accentColor = 'text-[var(--mc-positive)]',
  compact = false,
}) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {eyebrow ? <p className={`text-[10px] font-semibold ${accentColor}`}>{eyebrow}</p> : null}
      {title ? (
        <p
          className={`${compact ? 'text-[14px] leading-[1.22]' : 'text-[14px] leading-[1.24]'} font-bold [text-wrap:balance]`}
        >
          {title}
        </p>
      ) : null}
      {description ? (
        <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} leading-[1.4] opacity-55`}>{description}</p>
      ) : null}
    </div>
  );
}

export function MetricCard({ label, value, hint, theme, className = '', compact = false, strong = false }) {
  return (
    <div
      className={`min-w-0 rounded-[16px] border ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} ${className}`.trim()}
      style={{
        backgroundColor: theme.surfaceSoft,
        borderColor: strong ? `${theme.accent}33` : theme.border,
        boxShadow: strong ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <p className="text-[10px] font-semibold opacity-55">{label}</p>
      <p
        className={`mt-1.5 min-w-0 font-numbers font-extrabold tabular-nums leading-none tracking-[-0.04em] [overflow-wrap:anywhere] ${
          compact ? 'text-[clamp(0.95rem,4.8vw,1.12rem)]' : 'text-[clamp(1.02rem,5.2vw,1.32rem)]'
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className={`mt-1 leading-[1.3] opacity-55 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{hint}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({ text, hint }) {
  return (
    // Theme tokens rather than a fixed slate wash: the hardcoded values were
    // tuned for the dark surface and all but vanished on white.
    <div className="rounded-[16px] border border-[var(--mc-border-soft)] bg-[var(--mc-soft-faint)] px-4 py-5 text-center">
      {/* The message leads and the hint supports it. These were inverted: the
          hint was both larger and brighter than the thing it explained. */}
      <p className="text-[12px] font-semibold leading-[1.35] opacity-70">{text}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-sm text-[10px] leading-[1.4] opacity-55">{hint}</p> : null}
    </div>
  );
}

export function AllocationInput({ label, value, onChange, theme }) {
  return (
    <label
      className="rounded-[16px] border p-2.5"
      style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
    >
      <span className="mb-1.5 block text-[10px] font-semibold opacity-40 ">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent text-[clamp(1rem,4.8vw,1.15rem)] font-numbers font-extrabold outline-none"
          placeholder="0"
        />
        <Percent size={14} className="opacity-40" />
      </div>
    </label>
  );
}
