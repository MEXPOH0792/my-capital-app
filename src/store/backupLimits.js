export const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_DEPTH = 32;
export const MAX_BACKUP_NODES = 250_000;
export const MAX_BACKUP_ARRAY_ITEMS = 100_000;
export const MAX_BACKUP_OBJECT_KEYS = 200;
export const MAX_BACKUP_STRING_LENGTH = 1_000_000;

export class BackupImportLimitError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BackupImportLimitError';
    this.code = code;
  }
}

const fail = (code, message) => {
  throw new BackupImportLimitError(code, message);
};

export const assertBackupTextSize = (text) => {
  const byteLength = new TextEncoder().encode(String(text ?? '')).byteLength;
  if (byteLength > MAX_BACKUP_FILE_BYTES) {
    fail('BACKUP_FILE_TOO_LARGE', 'Backup file exceeds the 25 MB limit');
  }
};

export const assertBackupPayloadLimits = (root) => {
  const stack = [{ value: root, depth: 0 }];
  const seen = new WeakSet();
  let nodes = 0;

  while (stack.length) {
    const { value, depth } = stack.pop();
    nodes += 1;

    if (nodes > MAX_BACKUP_NODES) {
      fail('BACKUP_TOO_COMPLEX', 'Backup contains too many values');
    }
    if (depth > MAX_BACKUP_DEPTH) {
      fail('BACKUP_TOO_DEEP', 'Backup nesting is too deep');
    }
    if (typeof value === 'string' && value.length > MAX_BACKUP_STRING_LENGTH) {
      fail('BACKUP_STRING_TOO_LONG', 'Backup contains an excessively long text value');
    }
    if (!value || typeof value !== 'object') continue;
    if (seen.has(value)) {
      fail('BACKUP_CYCLIC_STRUCTURE', 'Backup contains a cyclic structure');
    }
    seen.add(value);

    if (Array.isArray(value)) {
      if (value.length > MAX_BACKUP_ARRAY_ITEMS) {
        fail('BACKUP_ARRAY_TOO_LARGE', 'Backup contains an excessively large list');
      }
      for (let index = value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: value[index], depth: depth + 1 });
      }
      continue;
    }

    const entries = Object.entries(value);
    if (entries.length > MAX_BACKUP_OBJECT_KEYS) {
      fail('BACKUP_OBJECT_TOO_LARGE', 'Backup object contains too many fields');
    }
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      stack.push({ value: entries[index][1], depth: depth + 1 });
    }
  }
};
