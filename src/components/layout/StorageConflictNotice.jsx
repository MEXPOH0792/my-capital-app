import { useEffect, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { STORAGE_CONFLICT_EVENT } from '../../store/state/core.js';

export default function StorageConflictNotice() {
  const [hasConflict, setHasConflict] = useState(false);

  useEffect(() => {
    const handleConflict = () => setHasConflict(true);
    window.addEventListener(STORAGE_CONFLICT_EVENT, handleConflict);
    return () => window.removeEventListener(STORAGE_CONFLICT_EVENT, handleConflict);
  }, []);

  if (!hasConflict) return null;
  const isEnglish = document.documentElement.lang === 'en';

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(12px+var(--safe-bottom))] z-[600] mx-auto flex max-w-lg items-start gap-3 rounded-[16px] border border-amber-400/35 bg-[var(--mc-surface)] p-3 shadow-2xl"
      role="alert"
      aria-live="assertive"
    >
      <TriangleAlert className="mt-0.5 shrink-0 text-amber-400" size={22} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{isEnglish ? 'Newer data is available' : 'Появились более свежие данные'}</p>
        <p className="mt-1 text-xs leading-[1.45] text-[var(--mc-text-dim)]">
          {isEnglish
            ? 'This tab stopped saving so it cannot overwrite changes from another tab or the widget.'
            : 'Эта вкладка перестала сохранять данные, чтобы не затереть изменения из другой вкладки или виджета.'}
        </p>
      </div>
      <button
        type="button"
        className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-[12px] bg-emerald-600 px-3 text-sm font-bold text-white"
        onClick={() => window.location.reload()}
      >
        <RefreshCw size={18} aria-hidden="true" />
        <span className="hidden min-[390px]:inline">{isEnglish ? 'Reload' : 'Обновить'}</span>
      </button>
    </div>
  );
}
