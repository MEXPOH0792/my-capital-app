// Promise-based password prompt. Code outside React (backup export/import,
// the recovery screen) awaits `requestBackupPassword`; the single
// <PasswordDialogHost /> mounted in App renders it. Without a host the request
// resolves to null, i.e. "cancelled".

let listener = null;

export const subscribePasswordDialog = (next) => {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
};

/**
 * @param {{ mode: 'export' | 'import', error?: string }} options
 * @returns {Promise<null | { password: string | null }>} null when cancelled;
 *   `password: null` only in export mode, when the user chose "no password".
 */
export const requestBackupPassword = (options) =>
  new Promise((resolve) => {
    if (!listener) {
      resolve(null);
      return;
    }
    listener({ options, resolve });
  });

export const MIN_BACKUP_PASSWORD_LENGTH = 8;
