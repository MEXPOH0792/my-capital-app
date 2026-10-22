import { useState } from 'react';
import { ChevronDown, Stethoscope } from 'lucide-react';
import { APP_VERSION } from '../../../app/appVersion.js';
import { SectionCard, SectionHeader } from '../../ui/AppUi.jsx';
import { SUPPORTED_CURRENCY_OPTIONS } from '../../../utils/money.js';
import { useDiagnosticsActions } from '../../../hooks/useDiagnosticsActions.js';
import { hasUndoableImport } from '../../../hooks/workspace/useBackupActions.js';
import { shouldWidgetShowAmounts } from '../../../domain/security.js';
import FamilyPanel from './FamilyPanel.jsx';

export default function SettingsPanel({ copy, store, theme, softPanelStyle, text, settings, locale, fmt }) {
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const diagnostics = useDiagnosticsActions({
    copyText: {
      copied: copy.settings.diagnosticsCopied,
      shared: copy.settings.diagnosticsShared,
      failed: copy.settings.diagnosticsFailed,
    },
  });
  const isEnglishLocale = store.language === 'en';
  const currencyLabel = isEnglishLocale ? 'Currency' : 'Валюта';
  const currencyOptions = SUPPORTED_CURRENCY_OPTIONS[store.language] || SUPPORTED_CURRENCY_OPTIONS.ru;
  const activeCurrency = currencyOptions.find((item) => item.code === store.currency) || currencyOptions[0];
  const {
    exportBackup,
    importBackup,
    undoImport,
    backupNotice,
    openOnboardingReconfigure,
    pinEnabled,
    securityForm,
    setSecurityForm,
    securityNotice,
    saveSecurityPin,
    clearSecurityPin,
    lockAppNow,
    showResetConfirm,
    setShowResetConfirm,
    onConfirmReset,
  } = settings;

  return (
    <div className="space-y-3">
      <SectionCard theme={theme} className="space-y-3 p-3">
        <SectionHeader eyebrow={copy.settings.title} title={text.settingsTitle} compact />

        <div className="grid grid-cols-1 gap-2">
          <div
            className="rounded-[16px] border px-3 py-2 opacity-70"
            style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold opacity-80">{text.versionLabel}</p>
              <p className="text-sm font-bold opacity-70">{APP_VERSION}</p>
            </div>
          </div>

          <div
            className="rounded-[16px] border px-3 py-2.5"
            style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
          >
            <p className="text-sm font-semibold opacity-80">{copy.settings.language}</p>
            <div
              className="mt-1.5 rounded-[16px] border p-1"
              style={{ borderColor: theme.border, backgroundColor: theme.surface }}
            >
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => store.setLanguage('ru')}
                  className={`min-w-0 rounded-[12px] border px-2 py-1.5 text-center text-sm font-black leading-none transition-all active:scale-[0.99] ${store.language === 'ru' ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.22)]' : ''}`}
                  style={
                    store.language === 'ru'
                      ? undefined
                      : { color: theme.textSecondary, borderColor: theme.border, backgroundColor: theme.surfaceSoft }
                  }
                >
                  {copy.settings.russian}
                </button>
                <button
                  type="button"
                  onClick={() => store.setLanguage('en')}
                  className={`min-w-0 rounded-[12px] border px-2 py-1.5 text-center text-sm font-black leading-none transition-all active:scale-[0.99] ${store.language === 'en' ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.22)]' : ''}`}
                  style={
                    store.language === 'en'
                      ? undefined
                      : { color: theme.textSecondary, borderColor: theme.border, backgroundColor: theme.surfaceSoft }
                  }
                >
                  {copy.settings.english}
                </button>
              </div>
            </div>
          </div>

          <div
            className="rounded-[16px] border px-3 py-2.5"
            style={{ backgroundColor: theme.surfaceSoft, borderColor: theme.border }}
          >
            <button
              type="button"
              onClick={() => setIsCurrencyOpen((value) => !value)}
              aria-expanded={isCurrencyOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold opacity-80">{currencyLabel}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 break-words text-sm font-bold opacity-70">{activeCurrency?.label}</span>
                <span className="shrink-0 text-sm font-semibold " style={{ color: theme.accent }}>
                  {store.currency}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {isCurrencyOpen ? (
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {currencyOptions.map((item) => {
                  const isActive = store.currency === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        store.setCurrency(item.code);
                        setIsCurrencyOpen(false);
                      }}
                      className={`flex items-center justify-between rounded-[12px] border px-3 py-2 text-left text-sm font-bold transition-all active:scale-[0.99] ${isActive ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]' : ''}`}
                      style={isActive ? undefined : { borderColor: theme.border, backgroundColor: theme.surface }}
                    >
                      <span className="min-w-0 break-words">{item.label}</span>
                      <span className="ml-3 shrink-0 text-sm font-semibold opacity-70">{item.code}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
            <button
              type="button"
              onClick={() => setIsBackupOpen((value) => !value)}
              aria-expanded={isBackupOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold opacity-80">{copy.settings.backupTitle}</span>
              <ChevronDown size={14} className={`shrink-0 transition-transform ${isBackupOpen ? 'rotate-180' : ''}`} />
            </button>
            {isBackupOpen ? (
              <>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={exportBackup}
                    className="rounded-[12px] bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(16,185,129,0.18)] transition-all"
                  >
                    {copy.settings.exportJson}
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('backup-import-input')?.click()}
                    className="rounded-[12px] border px-4 py-2 text-sm font-black transition-all"
                    style={{ borderColor: theme.border }}
                  >
                    {copy.settings.importJson}
                  </button>
                </div>
                <input
                  id="backup-import-input"
                  type="file"
                  accept=".json,.mcbackup,application/json,application/octet-stream,text/json,text/plain"
                  className="hidden"
                  onChange={importBackup}
                />
                {hasUndoableImport() && undoImport ? (
                  <button
                    type="button"
                    onClick={undoImport}
                    className="mt-2 w-full rounded-[12px] border px-4 py-2 text-sm font-black transition-all"
                    style={{ borderColor: theme.border }}
                  >
                    {isEnglishLocale ? 'Undo import' : 'Отменить импорт'}
                  </button>
                ) : null}
              </>
            ) : null}
            {backupNotice ? (
              <div
                className="mt-2 rounded-[12px] border px-3 py-2 text-sm leading-[1.35] opacity-70"
                style={softPanelStyle}
              >
                {backupNotice}
              </div>
            ) : null}
          </div>

          <FamilyPanel
            store={store}
            theme={theme}
            softPanelStyle={softPanelStyle}
            isEnglish={isEnglishLocale}
            locale={locale}
            fmt={fmt}
            family={{
              familyNotice: settings.familyNotice,
              importPartnerReport: settings.importPartnerReport,
              removePartnerReport: settings.removePartnerReport,
              removePartner: settings.removePartner,
            }}
          />

          <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
            <button
              type="button"
              onClick={() => setIsSecurityOpen((value) => !value)}
              aria-expanded={isSecurityOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold opacity-80">{text.securityTitle}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold opacity-80">
                  {pinEnabled ? copy.settings.enabled : copy.settings.disabled}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${isSecurityOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {isSecurityOpen ? (
              !pinEnabled ? (
                <>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      value={securityForm.pin}
                      onChange={(event) =>
                        setSecurityForm((prev) => ({ ...prev, pin: event.target.value.replace(/\D/g, '').slice(0, 6) }))
                      }
                      placeholder={text.pinPlaceholder}
                      className="w-full rounded-[12px] border px-4 py-2 text-sm font-bold outline-none"
                      style={softPanelStyle}
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      value={securityForm.confirmPin}
                      onChange={(event) =>
                        setSecurityForm((prev) => ({
                          ...prev,
                          confirmPin: event.target.value.replace(/\D/g, '').slice(0, 6),
                        }))
                      }
                      placeholder={text.pinConfirmPlaceholder}
                      className="w-full rounded-[12px] border px-4 py-2 text-sm font-bold outline-none"
                      style={softPanelStyle}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveSecurityPin}
                    className="mt-2 min-h-[44px] w-full rounded-[12px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xl shadow-emerald-600/20 transition-all"
                  >
                    {text.savePin}
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-2 rounded-[12px] border px-3 py-2 text-sm leading-[1.35]" style={softPanelStyle}>
                    {text.pinEnabledNotice}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={lockAppNow}
                      className="rounded-[12px] border px-4 py-2 text-sm font-black transition-all"
                      style={{ borderColor: theme.border }}
                    >
                      {text.lockNow}
                    </button>
                    <button
                      type="button"
                      onClick={clearSecurityPin}
                      className="rounded-[12px] border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-black text-[var(--mc-negative)] transition-all"
                    >
                      {text.removePin}
                    </button>
                  </div>

                  <label className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>
                      {isEnglishLocale ? 'Lock after leaving the app' : 'Блокировать после выхода из приложения'}
                    </span>
                    <select
                      value={store.autoLockMinutes === null ? 'never' : String(store.autoLockMinutes ?? 1)}
                      onChange={(event) =>
                        store.setAutoLockMinutes(event.target.value === 'never' ? null : Number(event.target.value))
                      }
                      className="rounded-[12px] border px-2 py-1.5 text-sm font-bold outline-none"
                      style={softPanelStyle}
                    >
                      <option value="0">{isEnglishLocale ? 'Immediately' : 'Сразу'}</option>
                      <option value="1">{isEnglishLocale ? 'After 1 min' : 'Через 1 мин'}</option>
                      <option value="5">{isEnglishLocale ? 'After 5 min' : 'Через 5 мин'}</option>
                      <option value="never">{isEnglishLocale ? 'Never' : 'Никогда'}</option>
                    </select>
                  </label>

                  <label className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>
                      {isEnglishLocale ? 'Show amounts on the home-screen widget' : 'Показывать суммы на виджете'}
                    </span>
                    <input
                      type="checkbox"
                      checked={shouldWidgetShowAmounts(true, store.widgetShowAmounts)}
                      onChange={(event) => store.setWidgetShowAmounts(event.target.checked)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                  </label>
                </>
              )
            ) : null}

            {securityNotice ? (
              <div className="mt-2 rounded-[12px] border px-3 py-2 text-sm leading-[1.35]" style={softPanelStyle}>
                {securityNotice}
              </div>
            ) : null}
          </div>

          <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen((value) => !value)}
              aria-expanded={isDiagnosticsOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold opacity-80">
                <Stethoscope size={12} aria-hidden="true" />
                {copy.settings.diagnosticsTitle}
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${isDiagnosticsOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {isDiagnosticsOpen ? (
              <>
                <p className="mt-2 text-sm leading-[1.4] opacity-70">{copy.settings.diagnosticsPrivacy}</p>
                <p className="mt-1 text-sm font-semibold opacity-80">
                  {copy.settings.diagnosticsErrorsCount(diagnostics.bufferedErrorsCount)}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={diagnostics.copyDiagnostics}
                    disabled={diagnostics.busy}
                    className="rounded-[12px] border px-4 py-2 text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-80"
                    style={{ borderColor: theme.border }}
                  >
                    {copy.settings.diagnosticsCopy}
                  </button>
                  <button
                    type="button"
                    onClick={diagnostics.shareDiagnostics}
                    disabled={diagnostics.busy}
                    className="rounded-[12px] bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(16,185,129,0.18)] transition-all disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    {copy.settings.diagnosticsShare}
                  </button>
                </div>
                {diagnostics.notice ? (
                  <div
                    className="mt-2 rounded-[12px] border px-3 py-2 text-sm leading-[1.35]"
                    style={softPanelStyle}
                    role="status"
                    aria-live="polite"
                  >
                    {diagnostics.notice}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard theme={theme} tone="destructive" className="space-y-2 p-3">
        <p className="text-sm font-semibold text-[var(--mc-negative)]">{text.startBaseTitle}</p>

        {!showResetConfirm ? (
          <button
            type="button"
            onClick={openOnboardingReconfigure}
            className="w-full rounded-[12px] border border-red-500/20 bg-transparent px-4 py-2 text-sm font-black text-[var(--mc-negative)] transition-all hover:bg-red-500/5 active:scale-[0.99]"
          >
            {text.startBaseAction}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onConfirmReset}
              className="rounded-[12px] bg-red-500 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(239,68,68,0.22)] transition-transform active:scale-[0.99]"
            >
              {copy.settings.erase}
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="rounded-[12px] border px-4 py-2 text-sm font-black transition-all active:scale-[0.99]"
              style={{ borderColor: theme.border }}
            >
              {copy.settings.cancel}
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
