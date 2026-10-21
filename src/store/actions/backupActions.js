import { sanitizeImportedState } from '../stateHelpers.js';
import {
  createBackupPayload,
  createSignedBackupPayload,
  parseBackupPayload,
  verifyBackupSignature,
} from '../backupSchema.js';
import { getOrCreateBackupSecret } from '../../utils/secureBridgeStorage.js';

/**
 * Thrown by `importDataAsync` when the payload is parseable but its HMAC
 * signature does not match the local install secret. The UI can either show a
 * warning + offer "import anyway" or refuse the import.
 */
export class BackupSignatureMismatchError extends Error {
  constructor(message = 'Backup signature does not match this device') {
    super(message);
    this.name = 'BackupSignatureMismatchError';
    this.code = 'BACKUP_SIGNATURE_MISMATCH';
  }
}

export const createBackupActions = (set, get) => ({
  /** Records a successful export so the backup reminder can go quiet. */
  markBackupExported: () => set({ lastBackupAt: new Date().toISOString() }),
  /**
   * Synchronous unsigned export. Kept for legacy callers and tests; the UI
   * should prefer `exportSignedData` which adds an HMAC tamper-evidence tag.
   */
  exportData: () => {
    const { securityPinHash: _securityPinHash, ...safeState } = sanitizeImportedState(get());
    void _securityPinHash;
    return createBackupPayload(safeState);
  },
  /**
   * Async export that signs the payload with the per-install HMAC secret.
   * The secret is created on first call and persisted via the bridge.
   */
  exportSignedData: async () => {
    const { securityPinHash: _securityPinHash, ...safeState } = sanitizeImportedState(get());
    void _securityPinHash;
    const keyHex = getOrCreateBackupSecret();
    return createSignedBackupPayload(safeState, keyHex);
  },
  /**
   * Synchronous import. Performs structural validation only and skips
   * signature verification. Returns the signature status for UI to surface.
   * Kept as the default for backward compatibility with existing flows; the
   * stricter `importDataAsync` should be used in new code.
   */
  importData: (payload) => {
    const parsed = parseBackupPayload(payload);
    set((state) => {
      const sanitized = sanitizeImportedState(parsed.state);
      return {
        ...sanitized,
        securityPinHash: state.securityPinHash,
        isDarkMode: sanitized.isDarkMode ?? state.isDarkMode,
        language: sanitized.language ?? state.language,
      };
    });
    return { signatureStatus: parsed.signature ? 'unchecked' : 'missing' };
  },
  /**
   * Async import that verifies the HMAC signature against the install secret.
   * Throws `BackupSignatureMismatchError` when the signature is present and
   * does not match, unless `acceptInvalid: true` is passed.
   * Returns: `{ signatureStatus: 'missing' | 'valid' | 'invalid' }`.
   */
  importDataAsync: async (payload, options = {}) => {
    const parsed = parseBackupPayload(payload);
    const keyHex = getOrCreateBackupSecret();
    const status = await verifyBackupSignature(parsed, keyHex);

    if (status === 'invalid' && !options.acceptInvalid) {
      throw new BackupSignatureMismatchError();
    }

    set((state) => {
      const sanitized = sanitizeImportedState(parsed.state);
      return {
        ...sanitized,
        securityPinHash: state.securityPinHash,
        isDarkMode: sanitized.isDarkMode ?? state.isDarkMode,
        language: sanitized.language ?? state.language,
      };
    });
    return { signatureStatus: status };
  },
});
