import { encryptBackup } from '../../utils/backupCrypto.js';
import { requestBackupPassword } from '../../utils/passwordDialog.js';
import { loadBackupPayload } from './backupFile.js';
import { shareGeneratedFile } from './shareFile.js';

// The state before the last import, kept in memory only: "undo import" is
// offered until the app restarts.
let preImportSnapshot = null;

export const hasUndoableImport = () => preImportSnapshot !== null;

export function useBackupActions({ store, copy, isEnglish, setBackupNotice }) {
  const exportBackup = async () => {
    const choice = await requestBackupPassword({ mode: 'export' });
    if (!choice) return;

    // Always signed: the signature tells a later import whether the file came
    // from this install. Encrypted on top when the user set a password.
    const signed = await store.exportSignedData();
    const isEncrypted = Boolean(choice.password);
    const content = isEncrypted ? await encryptBackup(signed, choice.password) : signed;
    const date = new Date().toISOString().slice(0, 10);
    const filename = `my-capital-backup-${date}.${isEncrypted ? 'mcbackup' : 'json'}`;
    const json = JSON.stringify(content, null, 2);
    const shareTitle = isEnglish ? 'My Capital backup' : 'Резервная копия Личный Капитал';
    const shareHint = isEnglish
      ? 'Choose where to save or send the backup file.'
      : 'Выбери, куда сохранить или отправить файл резервной копии.';

    const outcome = await shareGeneratedFile({
      filename,
      content: json,
      shareTitle,
      shareText: isEnglish ? 'JSON backup file' : 'JSON-файл резервной копии',
      dialogTitle: isEnglish ? 'Export backup' : 'Экспорт резервной копии',
    });
    if (outcome === 'cancelled') return;

    store.markBackupExported?.();
    setBackupNotice(outcome === 'shared' ? shareHint : copy.settings.backupExported);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const payload = await loadBackupPayload(file, { isEnglish, askPassword: requestBackupPassword });
      if (!payload) return;

      const confirmed = window.confirm(
        isEnglish
          ? 'Import backup and replace the current local data? You can undo this until the app restarts.'
          : 'Импортировать резервную копию и заменить текущие данные? Отменить можно до перезапуска приложения.',
      );
      if (!confirmed) return;

      const snapshot = store.exportData();
      let result;
      try {
        result = await store.importDataAsync(payload);
      } catch (error) {
        if (error?.code !== 'BACKUP_SIGNATURE_MISMATCH') throw error;
        // Every file from another phone lands here — that is the normal way to
        // move to a new device, so it is a question, not an error.
        const acceptForeign = window.confirm(
          isEnglish
            ? 'This backup was made on another device or has been changed since. Import it anyway?'
            : 'Эта копия создана на другом устройстве или была изменена. Всё равно импортировать?',
        );
        if (!acceptForeign) return;
        result = await store.importDataAsync(payload, { acceptInvalid: true });
      }
      preImportSnapshot = snapshot;
      setBackupNotice(
        result?.signatureStatus === 'missing'
          ? isEnglish
            ? 'Backup restored. It has no signature (made by an older version).'
            : 'Копия восстановлена. Подписи нет — файл сделан старой версией.'
          : copy.settings.backupRestored,
      );
    } catch (error) {
      setBackupNotice(
        isEnglish
          ? `Import failed: ${error?.message || 'unknown file error'}`
          : `Импорт не удался: ${error?.message || 'не удалось прочитать файл'}`,
      );
    }
  };

  const undoImport = () => {
    if (!preImportSnapshot) return;
    const confirmed = window.confirm(
      isEnglish ? 'Return to the data you had before the import?' : 'Вернуть данные, которые были до импорта?',
    );
    if (!confirmed) return;
    store.importData(preImportSnapshot);
    preImportSnapshot = null;
    setBackupNotice(isEnglish ? 'Import undone.' : 'Импорт отменён.');
  };

  return {
    exportBackup,
    importBackup,
    undoImport,
  };
}
