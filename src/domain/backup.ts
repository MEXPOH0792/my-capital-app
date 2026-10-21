// When to nudge the user to export a backup. Data lives only on the device, so
// a lost or reset phone takes everything with it unless a copy exists.

const REMIND_AFTER_DAYS = 14;
const MIN_OPERATIONS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export const shouldRemindBackup = (
  lastBackupAt: string | null | undefined,
  operationCount: number,
  nowMs: number,
): boolean => {
  if (operationCount <= MIN_OPERATIONS) return false;
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt).getTime();
  if (Number.isNaN(last)) return true;
  return nowMs - last > REMIND_AFTER_DAYS * DAY_MS;
};
