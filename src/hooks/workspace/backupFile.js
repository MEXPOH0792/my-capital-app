// Reading backup files, shared by settings import and the recovery screen.

import { decryptBackup, isEncryptedBackupEnvelope } from '../../utils/backupCrypto.js';
import {
  BackupImportLimitError,
  MAX_BACKUP_FILE_BYTES,
  assertBackupPayloadLimits,
  assertBackupTextSize,
} from '../../store/backupLimits.js';

const stripBom = (value) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim();

const localizeLimitError = (error, isEnglish) => {
  const messages = {
    BACKUP_FILE_TOO_LARGE: isEnglish ? 'The backup file is larger than 25 MB.' : 'Файл резервной копии больше 25 МБ.',
    BACKUP_TOO_COMPLEX: isEnglish ? 'The backup contains too much data.' : 'В резервной копии слишком много данных.',
    BACKUP_TOO_DEEP: isEnglish
      ? 'The backup has an unsafe nesting depth.'
      : 'В резервной копии недопустимо глубокая структура.',
    BACKUP_STRING_TOO_LONG: isEnglish
      ? 'The backup contains an excessively long text value.'
      : 'В резервной копии найдено слишком длинное текстовое значение.',
    BACKUP_ARRAY_TOO_LARGE: isEnglish
      ? 'The backup contains an excessively large list.'
      : 'В резервной копии найден слишком большой список.',
    BACKUP_OBJECT_TOO_LARGE: isEnglish
      ? 'The backup object contains too many fields.'
      : 'Один из объектов резервной копии содержит слишком много полей.',
    BACKUP_CYCLIC_STRUCTURE: isEnglish
      ? 'The backup contains an invalid repeated structure.'
      : 'Резервная копия содержит недопустимую повторяющуюся структуру.',
  };
  if (!messages[error?.code]) return error;
  const localized = new Error(messages[error.code]);
  localized.code = error.code;
  return localized;
};

export const readFileAsText = async (file) => {
  if (!file) return '';
  if (Number.isFinite(file.size) && file.size > MAX_BACKUP_FILE_BYTES) {
    throw new BackupImportLimitError('BACKUP_FILE_TOO_LARGE', 'Backup file exceeds the 25 MB limit');
  }

  try {
    const directText = await file.text();
    if (directText) {
      assertBackupTextSize(directText);
      return stripBom(directText);
    }
  } catch (error) {
    if (error?.code?.startsWith('BACKUP_')) throw error;
    // Fallback to FileReader below for Android WebView / SAF quirks.
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        assertBackupTextSize(reader.result);
        resolve(stripBom(reader.result));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsText(file, 'utf-8');
  });
};

/**
 * Reads a backup file and returns its payload, asking for the password when
 * the file is encrypted. Returns null when the user cancels the password
 * prompt. A wrong password re-asks with an error instead of failing.
 */
export const loadBackupPayload = async (file, { isEnglish, askPassword }) => {
  let text;
  try {
    text = await readFileAsText(file);
  } catch (error) {
    throw localizeLimitError(error, isEnglish);
  }
  if (!text) throw new Error(isEnglish ? 'Empty backup file' : 'Пустой файл резервной копии');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(isEnglish ? 'This is not a backup file' : 'Это не файл резервной копии');
  }
  try {
    assertBackupPayloadLimits(parsed);
  } catch (error) {
    throw localizeLimitError(error, isEnglish);
  }
  if (!isEncryptedBackupEnvelope(parsed)) return parsed;

  let error = '';
  for (;;) {
    const answer = await askPassword({ mode: 'import', error });
    if (!answer?.password) return null;
    try {
      const decrypted = await decryptBackup(parsed, answer.password);
      try {
        assertBackupPayloadLimits(decrypted);
      } catch (error) {
        throw localizeLimitError(error, isEnglish);
      }
      return decrypted;
    } catch (decryptError) {
      if (decryptError?.code !== 'BAD_PASSPHRASE') throw decryptError;
      error = isEnglish ? 'Wrong password.' : 'Неверный пароль.';
    }
  }
};
