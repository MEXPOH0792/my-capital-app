// Optional symmetric encryption layer for exported backup files.
//
// Format (envelope v1):
//   {
//     kind: 'capital-tree-pro:encrypted-backup',
//     v: 1,
//     kdf: { algo: 'pbkdf2-sha256', iter: 200000, salt: <hex 32 bytes> },
//     cipher: { algo: 'aes-256-gcm', iv: <hex 12 bytes>, ct: <base64 ciphertext+tag> }
//   }
//
// The plaintext is the JSON-serialized signed backup payload (including the
// HMAC signature from 2.3). The user supplies a passphrase; the key is derived
// via PBKDF2-SHA256 with a per-encryption random salt. AES-GCM provides
// confidentiality + authentication (the tag is appended to the ciphertext by
// SubtleCrypto, so a wrong key produces a decryption error, not silent
// garbage).

const KDF_ITER = 200_000;
const SALT_BYTES = 32;
const IV_BYTES = 12;
const KEY_BITS = 256;

export const ENCRYPTED_BACKUP_KIND = 'capital-tree-pro:encrypted-backup';
export const ENCRYPTED_BACKUP_VERSION = 1;

export interface EncryptedBackupEnvelope {
  kind: typeof ENCRYPTED_BACKUP_KIND;
  v: typeof ENCRYPTED_BACKUP_VERSION;
  kdf: { algo: 'pbkdf2-sha256'; iter: number; salt: string };
  cipher: { algo: 'aes-256-gcm'; iv: string; ct: string };
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toArrayBuffer = (view: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
};

const toHex = (view: Uint8Array): string =>
  Array.from(view)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string): Uint8Array => {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) throw new Error('Invalid hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const toBase64 = (view: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < view.length; i += 1) {
    s += String.fromCharCode(view[i] ?? 0);
  }
  if (typeof btoa === 'function') return btoa(s);
  // Node fallback
  return Buffer.from(view).toString('base64');
};

const fromBase64 = (b64: string): Uint8Array => {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node fallback
  return new Uint8Array(Buffer.from(b64, 'base64'));
};

const deriveAesKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(textEncoder.encode(passphrase)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations: KDF_ITER,
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
};

/**
 * Encrypt an arbitrary JSON-serializable payload with a user-supplied
 * passphrase. The returned envelope is itself JSON-serializable and safe to
 * share. Throws if `passphrase` is empty.
 */
export const encryptBackup = async (payload: unknown, passphrase: string): Promise<EncryptedBackupEnvelope> => {
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new Error('Passphrase is required');
  }
  const salt = new Uint8Array(SALT_BYTES);
  const iv = new Uint8Array(IV_BYTES);
  globalThis.crypto.getRandomValues(salt);
  globalThis.crypto.getRandomValues(iv);

  const key = await deriveAesKey(passphrase, salt);
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    kind: ENCRYPTED_BACKUP_KIND,
    v: ENCRYPTED_BACKUP_VERSION,
    kdf: { algo: 'pbkdf2-sha256', iter: KDF_ITER, salt: toHex(salt) },
    cipher: { algo: 'aes-256-gcm', iv: toHex(iv), ct: toBase64(new Uint8Array(ciphertext)) },
  };
};

export class BackupDecryptionError extends Error {
  override name = 'BackupDecryptionError';
  code: 'BAD_ENVELOPE' | 'BAD_PASSPHRASE';

  constructor(code: 'BAD_ENVELOPE' | 'BAD_PASSPHRASE', message: string) {
    super(message);
    this.code = code;
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const isEncryptedBackupEnvelope = (value: unknown): value is EncryptedBackupEnvelope => {
  if (!isPlainObject(value)) return false;
  if (value.kind !== ENCRYPTED_BACKUP_KIND) return false;
  if (value.v !== ENCRYPTED_BACKUP_VERSION) return false;
  if (!isPlainObject(value.kdf) || value.kdf.algo !== 'pbkdf2-sha256') return false;
  if (!isPlainObject(value.cipher) || value.cipher.algo !== 'aes-256-gcm') return false;
  return true;
};

/**
 * Decrypt an envelope produced by `encryptBackup`. Throws BackupDecryptionError
 * with `code = 'BAD_PASSPHRASE'` when the passphrase does not match (this is
 * indistinguishable from a corrupted ciphertext — both fail GCM tag check).
 */
export const decryptBackup = async (envelope: unknown, passphrase: string): Promise<unknown> => {
  if (!isEncryptedBackupEnvelope(envelope)) {
    throw new BackupDecryptionError('BAD_ENVELOPE', 'Not a recognized encrypted backup');
  }
  const env = envelope as EncryptedBackupEnvelope;
  const salt = fromHex(env.kdf.salt);
  const iv = fromHex(env.cipher.iv);
  const key = await deriveAesKey(passphrase, salt);
  let plaintextBuf: ArrayBuffer;
  try {
    plaintextBuf = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(fromBase64(env.cipher.ct)),
    );
  } catch {
    throw new BackupDecryptionError('BAD_PASSPHRASE', 'Wrong passphrase or corrupted file');
  }
  try {
    return JSON.parse(textDecoder.decode(plaintextBuf));
  } catch {
    throw new BackupDecryptionError('BAD_ENVELOPE', 'Decrypted content is not valid JSON');
  }
};
