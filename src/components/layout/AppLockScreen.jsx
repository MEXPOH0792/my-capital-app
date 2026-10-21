import React, { useEffect, useRef, useState } from 'react';
import { Fingerprint, LockKeyhole, Moon, Sun } from 'lucide-react';
import { SectionCard } from '../ui/AppUi.jsx';

const getText = (isEnglish) => ({
  badge: isEnglish ? 'Protected access' : 'Защищённый вход',
  title: isEnglish ? 'Enter PIN to continue' : 'Введи PIN, чтобы продолжить',
  body: isEnglish
    ? 'Financial data stays on this device. Unlock the app to continue working.'
    : 'Финансовые данные хранятся на этом устройстве. Разблокируй приложение, чтобы продолжить.',
  pinPlaceholder: isEnglish ? 'PIN code' : 'PIN-код',
  cta: isEnglish ? 'Unlock app' : 'Разблокировать',
  invalid: isEnglish ? 'Invalid PIN.' : 'Неверный PIN.',
  useBiometric: isEnglish ? 'Use biometrics' : 'Войти по биометрии',
  paused: (seconds) =>
    isEnglish
      ? `Too many wrong attempts. Try again in ${seconds} s.`
      : `Слишком много неверных попыток. Повтори через ${seconds} с.`,
  forgot: isEnglish ? 'Forgot PIN?' : 'Забыл PIN?',
  forgotBody: isEnglish
    ? 'The PIN cannot be recovered — it is not stored anywhere in readable form. You can erase the data on this device, or replace it with a backup file. Either way the PIN is removed.'
    : 'PIN восстановить нельзя — он нигде не хранится в открытом виде. Можно стереть данные на этом устройстве или заменить их файлом резервной копии. В обоих случаях PIN снимается.',
  restore: isEnglish ? 'Restore from backup file' : 'Восстановить из резервной копии',
  wipe: isEnglish ? 'Erase all data' : 'Стереть все данные',
  wipeWord: isEnglish ? 'DELETE' : 'УДАЛИТЬ',
  wipePrompt: (word) =>
    isEnglish
      ? `Type ${word} to erase all data on this device.`
      : `Введи ${word}, чтобы стереть все данные на этом устройстве.`,
  back: isEnglish ? 'Back to PIN' : 'Назад к вводу PIN',
  restoreFailed: isEnglish ? 'Could not restore: ' : 'Не удалось восстановить: ',
});

export default function AppLockScreen({
  isEnglish,
  isDarkMode,
  theme,
  rootStyle,
  panelStyle,
  softPanelStyle,
  onUnlock,
  onToggleTheme,
  onSetLanguage,
  biometric,
  pinLockedUntil = 0,
  forgotPin,
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const text = getText(isEnglish);
  const hasBiometric = Boolean(biometric?.supported && biometric?.enabled);
  const autoTriggeredRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [wipeWord, setWipeWord] = useState('');
  const fileRef = useRef(null);
  const pausedSeconds = Math.max(0, Math.ceil((pinLockedUntil - now) / 1000));
  const isPaused = pausedSeconds > 0;

  // Tick once a second while the pause runs so the countdown stays live.
  useEffect(() => {
    if (pinLockedUntil <= Date.now()) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pinLockedUntil]);

  const restoreFromFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !forgotPin?.restore) return;
    try {
      await forgotPin.restore(file);
    } catch (restoreError) {
      setError(`${text.restoreFailed}${restoreError?.message || ''}`);
    }
  };

  const tryBiometric = async () => {
    if (!hasBiometric || !biometric?.unlock) return;
    setError('');
    await biometric.unlock();
  };

  useEffect(() => {
    if (!hasBiometric || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBiometric]);

  const submit = async () => {
    setIsSubmitting(true);
    const isValid = await onUnlock(pin);
    if (!isValid) {
      setError(text.invalid);
      setPin('');
      setNow(Date.now());
      setIsSubmitting(false);
      return;
    }
    setError('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-5 py-6" style={rootStyle}>
      <div className="absolute left-5 right-5 top-[calc(20px+var(--safe-top))] mx-auto flex w-full max-w-xl items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSetLanguage('ru')}
            className={`rounded-full border px-4 py-2 text-[11px] font-semibold ${
              !isEnglish
                ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                : 'border-[var(--mc-border)] bg-[var(--mc-soft)] opacity-70'
            }`}
          >
            RU
          </button>
          <button
            type="button"
            onClick={() => onSetLanguage('en')}
            className={`rounded-full border px-4 py-2 text-[11px] font-semibold ${
              isEnglish
                ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]'
                : 'border-[var(--mc-border)] bg-[var(--mc-soft)] opacity-70'
            }`}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--mc-soft)]"
          style={{ borderColor: theme.border }}
        >
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      <div className="w-full max-w-md space-y-4">
        <SectionCard theme={theme} className="space-y-5 px-6 py-7">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${theme.accent}18`, color: theme.accent }}
          >
            <LockKeyhole size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold " style={{ color: theme.accent }}>
              {text.badge}
            </p>
            <h1 className="mt-3 font-display text-3xl font-black leading-[0.92] tracking-[-0.05em]">{text.title}</h1>
            <p className="mt-4 text-sm leading-6 opacity-70">{text.body}</p>
          </div>
        </SectionCard>

        <div className="rounded-[22px] border p-3.5" style={panelStyle}>
          <div className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              placeholder={text.pinPlaceholder}
              className="w-full rounded-[22px] border px-4 py-4 text-center text-2xl font-black outline-none"
              style={softPanelStyle}
            />
            {isPaused || error ? (
              <div className="rounded-[22px] border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-[var(--mc-negative)]">
                {isPaused ? text.paused(pausedSeconds) : error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={pin.length < 4 || isSubmitting || isPaused}
              className="w-full rounded-[22px] bg-emerald-600 py-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {text.cta}
            </button>
            {hasBiometric ? (
              <button
                type="button"
                onClick={tryBiometric}
                className="flex w-full items-center justify-center gap-2 rounded-[22px] border py-4 text-[11px] font-semibold "
                style={{ borderColor: theme.border, color: theme.accent }}
              >
                <Fingerprint size={16} />
                {text.useBiometric}
              </button>
            ) : null}
            {forgotPin && !isForgotOpen ? (
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="w-full py-2 text-[11px] font-semibold opacity-60"
              >
                {text.forgot}
              </button>
            ) : null}
          </div>
        </div>

        {forgotPin && isForgotOpen ? (
          <div className="space-y-3 rounded-[22px] border p-3.5" style={panelStyle}>
            <p className="text-[12px] leading-[1.45] opacity-75">{text.forgotBody}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.mcbackup,application/json"
              hidden
              onChange={restoreFromFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-[22px] bg-emerald-600 py-3.5 text-[11px] font-semibold text-white"
            >
              {text.restore}
            </button>
            <p className="text-[11px] leading-[1.4] opacity-65">{text.wipePrompt(text.wipeWord)}</p>
            <input
              type="text"
              value={wipeWord}
              onChange={(event) => setWipeWord(event.target.value)}
              placeholder={text.wipeWord}
              aria-label={text.wipePrompt(text.wipeWord)}
              className="w-full rounded-[22px] border px-4 py-3 text-center text-[13px] font-bold outline-none"
              style={softPanelStyle}
            />
            <button
              type="button"
              onClick={() => forgotPin.wipe()}
              disabled={wipeWord.trim().toUpperCase() !== text.wipeWord}
              className="w-full rounded-[22px] border border-red-500/40 py-3.5 text-[11px] font-semibold text-[var(--mc-negative)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {text.wipe}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsForgotOpen(false);
                setWipeWord('');
              }}
              className="w-full py-2 text-[11px] font-semibold opacity-60"
            >
              {text.back}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
