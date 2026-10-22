import React from 'react';
import { ArrowLeft, Menu, Moon, Sun } from 'lucide-react';

export default function AppHeader({
  activeTab,
  copy,
  isDarkMode,
  onBackHome,
  onOpenSidebar,
  onToggleTheme,
  panelStyle,
  theme,
}) {
  const isHome = activeTab === 'home';
  const headerClassName =
    'fixed inset-x-0 top-0 z-50 flex h-[calc(72px+var(--safe-top))] shrink-0 items-end justify-between px-4 pb-3 pt-[calc(10px+var(--safe-top))] md:h-[calc(88px+var(--safe-top))] md:px-12 md:pb-4 md:pt-[calc(12px+var(--safe-top))]';
  const headerStyle = {
    backgroundColor: theme.bg,
    borderColor: 'transparent',
  };

  return (
    <header className={headerClassName} style={headerStyle}>
      <div className="flex items-center gap-2 min-w-0">
        {!isHome && (
          <button
            type="button"
            onClick={onBackHome}
            aria-label={copy.backToTree || 'Back'}
            className="min-h-[48px] rounded-2xl flex items-center justify-center gap-2 px-2 transition-all border border-transparent active:scale-95 text-[var(--mc-positive)]"
            style={panelStyle}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span className="text-sm">{copy.backToTree}</span>
          </button>
        )}

        {isHome && (
          <div className="flex min-w-0 flex-col">
            <span className="break-words font-display font-bold text-base leading-snug">{copy.appTitle}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDarkMode ? 'Light theme' : 'Dark theme'}
          aria-pressed={isDarkMode}
          className="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all border border-transparent active:border-[var(--mc-border)] shrink-0"
          style={panelStyle}
        >
          {isDarkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={copy.menu || 'Menu'}
          aria-haspopup="dialog"
          className="min-h-[48px] rounded-2xl flex items-center justify-center gap-2 px-3 transition-transform active:scale-95"
          style={panelStyle}
        >
          <Menu size={22} aria-hidden="true" />
          <span className="text-sm font-semibold">{copy.menu}</span>
        </button>
      </div>
    </header>
  );
}
