import React from 'react';
import { ArrowLeft, Menu, Moon, Sun } from 'lucide-react';

export default function AppHeader({
  activeTab,
  copy,
  pageTitle,
  financeSectionLabel,
  isFinanceSection,
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
      <div className="flex items-center gap-4 md:gap-6 min-w-0">
        {isHome ? (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label={copy.menu || 'Menu'}
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all border border-transparent active:scale-95"
            style={panelStyle}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onBackHome}
            aria-label={copy.backToTree || 'Back'}
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all border border-transparent active:scale-95 text-[var(--mc-positive)]"
            style={panelStyle}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}

        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display font-black text-[11px] md:text-xs md:">
            {isHome ? copy.appTitle : pageTitle}
          </span>
          {!isHome && (
            <span className="text-[10px] font-bold opacity-40 ">
              {isFinanceSection ? financeSectionLabel : copy.backToTree}
            </span>
          )}
        </div>
      </div>

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
    </header>
  );
}
