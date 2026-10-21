import React, { useRef, useState } from 'react';
import { DatabaseBackup } from 'lucide-react';
import { SectionCard } from '../ui/AppUi.jsx';

const getText = (isEnglish) => ({
  badge: isEnglish ? 'Data recovery' : 'Восстановление данных',
  title: isEnglish ? 'Could not read your data' : 'Не удалось прочитать данные',
  body: isEnglish
    ? 'Android could not decrypt the data saved on this device — this happens after some system updates or a screen-lock change. Nothing was deleted: the unreadable copy is kept aside. Restore from a backup file, or start over.'
    : 'Android не смог расшифровать данные на этом устройстве — так бывает после некоторых обновлений системы или смены блокировки экрана. Ничего не удалено: нечитаемая копия отложена. Восстанови данные из файла резервной копии или начни заново.',
  restore: isEnglish ? 'Restore from backup file' : 'Восстановить из файла резервной копии',
  startOver: isEnglish ? 'Start over' : 'Начать заново',
  confirmStartOver: isEnglish
    ? 'Start with empty data? The unreadable copy stays on the device, but the app will not use it.'
    : 'Начать с пустыми данными? Нечитаемая копия останется на устройстве, но приложение её использовать не будет.',
  failed: isEnglish ? 'Could not restore: ' : 'Не удалось восстановить: ',
});

/**
 * Shown instead of onboarding when saved data exists but cannot be decrypted.
 * Store writes stay suspended until the user makes a choice, so the empty
 * default state is never saved over anything by accident.
 */
export default function StorageRecoveryScreen({ isEnglish, theme, rootStyle, panelStyle, onRestoreFile, onStartOver }) {
  const text = getText(isEnglish);
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsBusy(true);
    setError('');
    try {
      await onRestoreFile(file);
    } catch (restoreError) {
      setError(`${text.failed}${restoreError?.message || ''}`);
    } finally {
      setIsBusy(false);
    }
  };

  const startOver = () => {
    if (typeof window !== 'undefined' && !window.confirm(text.confirmStartOver)) return;
    onStartOver();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-5 py-6" style={rootStyle}>
      <div className="w-full max-w-md space-y-4">
        <SectionCard theme={theme} className="space-y-5 px-6 py-7">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${theme.accent}18`, color: theme.accent }}
          >
            <DatabaseBackup size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold" style={{ color: theme.accent }}>
              {text.badge}
            </p>
            <h1 className="mt-3 font-display text-3xl font-black leading-[0.92] tracking-[-0.05em]">{text.title}</h1>
            <p className="mt-4 text-sm leading-6 opacity-70">{text.body}</p>
          </div>
        </SectionCard>

        <div className="space-y-3 rounded-[22px] border p-3.5" style={panelStyle}>
          <input ref={inputRef} type="file" accept=".json,.mcbackup,application/json" hidden onChange={handleFile} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isBusy}
            className="w-full rounded-[22px] bg-emerald-600 py-4 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            {text.restore}
          </button>
          <button
            type="button"
            onClick={startOver}
            disabled={isBusy}
            className="w-full rounded-[22px] border py-4 text-[11px] font-semibold disabled:opacity-40"
            style={{ borderColor: theme.border }}
          >
            {text.startOver}
          </button>
          {error ? (
            <div className="rounded-[22px] border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-[var(--mc-negative)]">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
