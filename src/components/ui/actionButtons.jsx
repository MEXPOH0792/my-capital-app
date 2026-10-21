export function ActionButton({ label, icon: Icon, onClick, theme, color, compact = false }) {
  const buttonClass = compact
    ? 'flex flex-col items-center justify-center gap-1 rounded-[16px] border px-2.5 py-2 active:scale-95 transition-all group'
    : 'flex flex-col items-center justify-center p-6 md:p-10 rounded-[22px] md:rounded-[22px] border gap-3 md:gap-4 active:scale-95 transition-all group';
  const iconWrapClass = compact
    ? 'p-1.5 rounded-[12px] transition-all group-hover:scale-105'
    : 'p-4 rounded-3xl transition-all group-hover:scale-110';
  const labelClass = compact
    ? 'text-[10px] font-semibold opacity-70 group-hover:opacity-100'
    : 'text-[10px] font-semibold opacity-55 group-hover:opacity-100';

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={buttonClass}
      style={{ backgroundColor: theme.surface, borderColor: theme.border, boxShadow: theme.panelShadow }}
    >
      <div
        className={iconWrapClass}
        style={{
          background: `linear-gradient(180deg, ${color}1f, ${color}0d)`,
          color,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 14px -10px ${color}38`,
        }}
      >
        <Icon size={compact ? 16 : 24} className="md:hidden" />
        <Icon size={28} className="hidden md:block" />
      </div>
      <span className={labelClass}>{label}</span>
    </button>
  );
}

export function MobileActionButton({ label, icon: Icon, onClick, color }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center gap-3 rounded-[22px] px-4 py-4 text-sm font-black transition-all active:scale-95"
      style={{
        background: `linear-gradient(180deg, ${color}1C, ${color}10)`,
        color,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16)`,
      }}
    >
      <Icon size={20} />
      <span className="">{label}</span>
    </button>
  );
}
