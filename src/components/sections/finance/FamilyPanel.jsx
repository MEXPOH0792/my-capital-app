import { useState } from 'react';
import { Check, ChevronDown, Trash2, Users, X } from 'lucide-react';
import { formatMonthLabel } from '../../../domain/family.js';

/**
 * Family budget in settings: take in the partner's monthly spending report and
 * manage what was received. These figures live only in the report screen — no
 * account of the user is touched by anything here.
 */
export default function FamilyPanel({ store, theme, softPanelStyle, isEnglish, locale, fmt, family }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const member = store.familyMember;
  const reports = store.familyReports || [];
  const text = {
    title: isEnglish ? 'Family' : 'Семья',
    empty: isEnglish
      ? 'Add the monthly spending report your partner sent you, and the report screen will show the family total.'
      : 'Добавь отчёт о расходах, который прислал партнёр, — и в отчёте появится общий расход семьи.',
    add: isEnglish ? 'Add partner report' : 'Добавить отчёт партнёра',
    months: isEnglish ? 'Months received' : 'Полученные месяцы',
    noMonths: isEnglish ? 'No reports yet.' : 'Отчётов пока нет.',
    rename: isEnglish ? 'Rename' : 'Переименовать',
    remove: isEnglish ? 'Remove partner' : 'Удалить участника',
    removeMonth: isEnglish ? 'Remove this month' : 'Удалить этот месяц',
    received: isEnglish ? 'received' : 'получено',
  };

  const saveName = () => {
    const name = draftName.trim();
    if (name) store.renameFamilyMember(name);
    setIsRenaming(false);
  };

  return (
    <div className="rounded-[16px] border px-3 py-2.5" style={softPanelStyle}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold opacity-80">
          <Users size={12} />
          {text.title}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold opacity-80">{member ? member.name : '—'}</span>
          <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen ? (
        <>
          {!member ? <p className="mt-2 text-sm leading-[1.4] opacity-65">{text.empty}</p> : null}

          {member ? (
            <div className="mt-2 flex items-center gap-1.5">
              {isRenaming ? (
                <>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveName();
                      if (event.key === 'Escape') setIsRenaming(false);
                    }}
                    aria-label={text.rename}
                    autoFocus
                    className="min-w-0 flex-1 rounded-[12px] border px-2 py-1 text-sm font-bold outline-none"
                    style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    aria-label={text.rename}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[var(--mc-positive)]"
                    style={{ borderColor: theme.border }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    aria-label={isEnglish ? 'Cancel' : 'Отмена'}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border opacity-80"
                    style={{ borderColor: theme.border }}
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <p className="min-w-0 flex-1 break-words text-sm font-bold">{member.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(member.name);
                      setIsRenaming(true);
                    }}
                    className="shrink-0 rounded-full border px-3 py-1 text-sm font-semibold text-[var(--mc-positive)]"
                    style={{ borderColor: theme.border }}
                  >
                    {text.rename}
                  </button>
                </>
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => document.getElementById('family-import-input')?.click()}
            className="mt-2 w-full rounded-[12px] bg-emerald-600 px-4 py-2 text-sm font-black text-white transition-all"
          >
            {text.add}
          </button>
          <input
            id="family-import-input"
            type="file"
            accept=".mcfamily,.json,application/json"
            className="hidden"
            onChange={family.importPartnerReport}
          />

          {member ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-sm font-semibold opacity-80">{text.months}</p>
              {reports.length === 0 ? (
                <p className="text-sm opacity-80">{text.noMonths}</p>
              ) : (
                reports.map((item) => (
                  <div
                    key={item.monthKey}
                    className="flex items-center justify-between gap-2 rounded-[12px] border px-3 py-2"
                    style={{ borderColor: theme.border }}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">{formatMonthLabel(item.monthKey, locale)}</p>
                      <p className="mt-0.5 text-sm opacity-50">
                        {text.received} {new Date(item.importedAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-numbers font-black">{fmt(item.expensesTotal)}</span>
                      <button
                        type="button"
                        onClick={() => family.removePartnerReport(item.monthKey)}
                        aria-label={text.removeMonth}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[var(--mc-negative)] opacity-70"
                        style={{ borderColor: theme.border }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={family.removePartner}
                className="w-full rounded-[12px] border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-black text-[var(--mc-negative)]"
              >
                {text.remove}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {family.familyNotice ? (
        <div className="mt-2 rounded-[12px] border px-3 py-2 text-sm leading-[1.35] opacity-70" style={softPanelStyle}>
          {family.familyNotice}
        </div>
      ) : null}
    </div>
  );
}
