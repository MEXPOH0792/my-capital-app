import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { MIN_BACKUP_PASSWORD_LENGTH, subscribePasswordDialog } from '../../utils/passwordDialog.js';

const getText = (isEnglish, mode) => ({
  title:
    mode === 'export'
      ? isEnglish
        ? 'Protect the backup with a password'
        : 'Защити резервную копию паролем'
      : isEnglish
        ? 'This backup is encrypted'
        : 'Резервная копия зашифрована',
  body:
    mode === 'export'
      ? isEnglish
        ? 'The file will be unreadable without this password. It cannot be recovered — write it down.'
        : 'Без этого пароля файл не открыть. Восстановить пароль нельзя — запиши его.'
      : isEnglish
        ? 'Enter the password used when the backup was saved.'
        : 'Введи пароль, который задавал при сохранении копии.',
  password: isEnglish ? 'Password' : 'Пароль',
  confirm: isEnglish ? 'Repeat password' : 'Повтори пароль',
  tooShort: isEnglish
    ? `At least ${MIN_BACKUP_PASSWORD_LENGTH} characters.`
    : `Минимум ${MIN_BACKUP_PASSWORD_LENGTH} символов.`,
  mismatch: isEnglish ? 'Passwords do not match.' : 'Пароли не совпадают.',
  encrypt: isEnglish ? 'Encrypt and save' : 'Зашифровать и сохранить',
  open: isEnglish ? 'Open backup' : 'Открыть копию',
  noPassword: isEnglish ? 'Save without password' : 'Сохранить без пароля',
  noPasswordHint: isEnglish
    ? 'Without a password anyone who gets the file can read all your finances.'
    : 'Без пароля любой, у кого окажется файл, увидит все твои финансы.',
  cancel: isEnglish ? 'Cancel' : 'Отмена',
});

export default function PasswordDialogHost({ isEnglish, theme }) {
  const [request, setRequest] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(
    () =>
      subscribePasswordDialog((next) => {
        setPassword('');
        setConfirm('');
        setRequest(next);
      }),
    [],
  );

  if (!request) return null;

  const { mode, error } = request.options;
  const text = getText(isEnglish, mode);
  const isExport = mode === 'export';
  const isLongEnough = password.length >= MIN_BACKUP_PASSWORD_LENGTH;
  const matches = password === confirm;
  const canSubmit = isExport ? isLongEnough && matches : password.length > 0;
  const hint =
    isExport && password.length > 0 ? (!isLongEnough ? text.tooShort : !matches && confirm ? text.mismatch : '') : '';

  const finish = (value) => {
    request.resolve(value);
    setRequest(null);
  };

  const submit = () => {
    if (canSubmit) finish({ password });
  };

  const fieldClass = 'w-full rounded-[16px] border px-4 py-3 text-[14px] font-bold outline-none';
  const fieldStyle = { borderColor: theme.border, backgroundColor: theme.surfaceSoft };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-5"
      role="dialog"
      aria-modal="true"
      aria-label={text.title}
    >
      <div
        className="w-full max-w-sm space-y-3 rounded-[22px] border p-4"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-full bg-emerald-500/10 p-2 text-[var(--mc-positive)]">
            <KeyRound size={16} />
          </div>
          <p className="text-[14px] font-extrabold leading-[1.2]">{text.title}</p>
        </div>
        <p className="text-[11px] leading-[1.4] opacity-65">{text.body}</p>

        <input
          type="password"
          autoFocus
          autoComplete={isExport ? 'new-password' : 'current-password'}
          value={password}
          placeholder={text.password}
          aria-label={text.password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          className={fieldClass}
          style={fieldStyle}
        />
        {isExport ? (
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            placeholder={text.confirm}
            aria-label={text.confirm}
            onChange={(event) => setConfirm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
            className={fieldClass}
            style={fieldStyle}
          />
        ) : null}

        {error || hint ? <p className="text-[11px] leading-[1.35] text-[var(--mc-negative)]">{error || hint}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-[16px] bg-emerald-600 py-3 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExport ? text.encrypt : text.open}
        </button>

        {isExport ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => finish({ password: null })}
              className="w-full rounded-[16px] border py-2.5 text-[11px] font-semibold"
              style={{ borderColor: theme.border }}
            >
              {text.noPassword}
            </button>
            <p className="text-center text-[10px] leading-[1.35] opacity-55">{text.noPasswordHint}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => finish(null)}
          className="w-full rounded-[16px] py-2 text-[11px] font-semibold opacity-60"
        >
          {text.cancel}
        </button>
      </div>
    </div>
  );
}
