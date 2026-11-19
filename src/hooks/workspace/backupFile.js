// Reading backup files, shared by settings import and the recovery screen.

import { decryptBackup, isEncryptedBackupEnvelope } from '../../utils/backupCrypto.js';

const stripBom = (value) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim();

export const readFileAsText = async (file) => {
  if (!file) return '';

  try {
    const directText = await file.text();
    if (directText) return stripBom(directText);
  } catch {
    // Fallback to FileReader below for Android WebView / SAF quirks.
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(stripBom(reader.result));
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
  const text = await readFileAsText(file);
  if (!text) throw new Error(isEnglish ? 'Empty backup file' : 'Пустой файл резервной копии');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(isEnglish ? 'This is not a backup file' : 'Это не файл резервной копии');
  }
  if (!isEncryptedBackupEnvelope(parsed)) return parsed;

  let error = '';
  for (;;) {
    const answer = await askPassword({ mode: 'import', error });
    if (!answer?.password) return null;
    try {
      return await decryptBackup(parsed, answer.password);
    } catch (decryptError) {
      if (decryptError?.code !== 'BAD_PASSPHRASE') throw decryptError;
      error = isEnglish ? 'Wrong password.' : 'Неверный пароль.';
    }
  }
};
