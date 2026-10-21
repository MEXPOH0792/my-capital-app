import React from 'react';
import { X } from 'lucide-react';
import { APP_VERSION } from '../../app/appVersion.js';
import appLogo from '../../assets/app-logo.jpg';

function NavGroup({ label, items, activeTab, setActiveTab, onClose, isItemActive, theme }) {
  if (!items?.length) return null;

  return (
    <>
      {label ? (
        <div className="px-1.5 pt-3.5 pb-1.5">
          <p className="text-[10px] font-semibold opacity-40">{label}</p>
        </div>
      ) : null}

      {items.map((item) => {
        const active = isItemActive ? isItemActive(item.id) : activeTab === item.id;
        const highlightColor = item.id === 'home' || item.id === 'debts' ? '#42B741' : theme.accent;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              onClose();
            }}
            className={`w-full flex items-center justify-start gap-3 rounded-[16px] border px-4 py-3 text-left transition-all ${
              active
                ? 'border-emerald-500/20 text-[var(--mc-positive)] shadow-[0_12px_24px_rgba(66,183,65,0.08)]'
                : 'border-transparent hover:bg-[var(--mc-hover)] opacity-55 hover:opacity-100'
            }`}
            style={{ backgroundColor: active ? `${highlightColor}10` : 'transparent' }}
          >
            <item.icon size={18} />
            <span className="text-[10px] font-semibold leading-4">{item.navLabel}</span>
          </button>
        );
      })}
    </>
  );
}

export default function AppSidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  primaryNavItems,
  secondaryNavItems,
  setupNavItems,
  copy,
  insightsGroupLabel,
  financeGroupLabel,
  theme,
}) {
  const setupTabIds = new Set(setupNavItems.map((item) => item.id));
  const secondaryTabIds = new Set(secondaryNavItems.map((item) => item.id));
  const isItemActive = (itemId) => {
    if (itemId === 'settings') return activeTab === 'settings' || setupTabIds.has(activeTab);
    if (secondaryTabIds.has(itemId)) return activeTab === itemId;
    return activeTab === itemId;
  };

  return isOpen ? (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[100] bg-black/60" aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={copy.menu || 'Navigation'}
        className="fixed left-0 top-0 bottom-0 z-[110] flex w-[82vw] max-w-68 flex-col overflow-hidden border-r p-4 safe-top safe-bottom md:p-6"
        style={{ backgroundColor: theme.sidebarBg, borderColor: theme.border, boxShadow: theme.panelShadow }}
      >
        <div className="mb-6 flex items-center justify-between md:mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-lg border border-[var(--mc-border)] bg-black/10">
              <img src={appLogo} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="font-black text-[10px] ">{copy.menu}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.common?.cancel || 'Close menu'}
            className="opacity-40 hover:opacity-100 transition-opacity"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          <NavGroup
            items={primaryNavItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onClose={onClose}
            isItemActive={isItemActive}
            theme={theme}
          />
          <NavGroup
            label={insightsGroupLabel}
            items={secondaryNavItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onClose={onClose}
            isItemActive={isItemActive}
            theme={theme}
          />
          <NavGroup
            label={financeGroupLabel}
            items={setupNavItems}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onClose={onClose}
            isItemActive={isItemActive}
            theme={theme}
          />
        </nav>

        <div className="mt-auto border-t pt-5" style={{ borderColor: theme.border }}>
          <p className="text-[10px] font-display font-semibold opacity-40 text-center">
            {copy.appTitle} v{APP_VERSION}
          </p>
        </div>
      </aside>
    </>
  ) : null;
}
