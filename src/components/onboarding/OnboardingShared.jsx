import React from 'react';

export function EmptyState({ title, body, panelStyle, footer }) {
  return (
    <div className="rounded-[16px] border px-3.5 py-3 text-center" style={panelStyle}>
      <p className="text-[13px] font-black leading-[1.2] [text-wrap:balance]">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed opacity-80">{body}</p>
      {footer ? <div className="mt-2.5">{footer}</div> : null}
    </div>
  );
}

export function FormField({ label, children }) {
  return (
    <label className="space-y-0.5">
      <span className="block text-sm font-semibold opacity-80">{label}</span>
      {children}
    </label>
  );
}

export function PrimaryButton({ children, onClick, disabled, light = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[48px] w-full rounded-[12px] px-4 py-3 text-base font-semibold transition-transform active:scale-[0.99] ${light ? 'bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.08)]' : 'bg-emerald-600 text-white shadow-[0_8px_18px_rgba(16,185,129,0.18)]'} disabled:opacity-55 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}
