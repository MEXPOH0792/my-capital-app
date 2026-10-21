// PIN hashing with backward compatibility.
//
// V2 (current): PBKDF2-SHA256, 200k iterations, per-install random 32-byte salt.
// Stored as JSON envelope: { v:2, algo:'pbkdf2-sha256', iter:N, salt:hex, hash:hex }.
//
// V1 (legacy): plain SHA-256 of `capital-tree-pro:${pin}`. Stored as raw 64-hex string.
// On a successful V1 unlock the caller should migrate to V2.
//
// The "stored value" abstraction lives in the store; this module deals only with
// hashing, verifying and producing the JSON envelope.

const textEncoder = new TextEncoder();

export const PIN_HASH_VERSION = 2;
export const PIN_PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 32;
const KEY_BYTES = 32;

export interface PinRecordV2 {
  v: 2;
  algo: 'pbkdf2-sha256';
  iter: number;
  salt: string;
  hash: string;
}

export type PinRecord = PinRecordV2;

export const normalizePin = (value: unknown): string =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);

export const isValidPin = (value: unknown): boolean => /^\d{4,6}$/.test(normalizePin(value));

const toHex = (buffer: ArrayBuffer | Uint8Array): string => {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const sha256 = async (input: string): Promise<string> => {
  const payload = textEncoder.encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload);
  return toHex(digest);
};

const generateSalt = (): Uint8Array => {
  const salt = new Uint8Array(SALT_BYTES);
  globalThis.crypto.getRandomValues(salt);
  return salt;
};

const toArrayBuffer = (view: Uint8Array): ArrayBuffer => {
  // Copy into a fresh ArrayBuffer so the type checker is happy with strict
  // SubtleCrypto signatures (which reject SharedArrayBuffer-backed views).
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
};

const derivePbkdf2 = async (pin: string, saltBytes: Uint8Array, iterations: number): Promise<Uint8Array> => {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(textEncoder.encode(`capital-tree-pro:${pin}`)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(saltBytes),
      iterations,
    },
    keyMaterial,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
};

const constantTimeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export const hashPin = async (
  value: unknown,
  options: { salt?: Uint8Array; iterations?: number } = {},
): Promise<PinRecord> => {
  const pin = normalizePin(value);
  if (!isValidPin(pin)) {
    throw new Error('PIN must contain 4 to 6 digits');
  }
  const salt = options.salt ?? generateSalt();
  const iterations = options.iterations ?? PIN_PBKDF2_ITERATIONS;
  const derived = await derivePbkdf2(pin, salt, iterations);
  return {
    v: 2,
    algo: 'pbkdf2-sha256',
    iter: iterations,
    salt: toHex(salt),
    hash: toHex(derived),
  };
};

export const serializePinRecord = (record: PinRecord): string => JSON.stringify(record);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const parsePinRecord = (stored: unknown): PinRecord | null => {
  if (typeof stored !== 'string' || stored.length === 0) return null;
  // Legacy SHA-256 records are stored as raw 64-hex strings.
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!isPlainObject(parsed)) return null;
    if (parsed.v !== 2 || parsed.algo !== 'pbkdf2-sha256') return null;
    if (typeof parsed.iter !== 'number' || parsed.iter < 1) return null;
    if (typeof parsed.salt !== 'string' || !/^[a-f0-9]+$/i.test(parsed.salt)) return null;
    if (typeof parsed.hash !== 'string' || !/^[a-f0-9]+$/i.test(parsed.hash)) return null;
    return { v: 2, algo: 'pbkdf2-sha256', iter: parsed.iter, salt: parsed.salt, hash: parsed.hash };
  } catch {
    return null;
  }
};

const isLegacySha256Record = (stored: unknown): stored is string =>
  typeof stored === 'string' && /^[a-f0-9]{64}$/i.test(stored);

const verifyLegacySha256 = async (pin: unknown, expectedHash: string): Promise<boolean> => {
  const normalized = normalizePin(pin);
  if (!isValidPin(normalized)) return false;
  const actual = await sha256(`capital-tree-pro:${normalized}`);
  return constantTimeEqualHex(actual, expectedHash);
};

export interface VerifyResult {
  ok: boolean;
  needsMigration: boolean;
  /** When migration is needed, the upgraded record the caller should persist. */
  upgradedRecord?: PinRecord;
}

export const verifyPin = async (pin: unknown, stored: unknown): Promise<VerifyResult> => {
  if (!stored) return { ok: false, needsMigration: false };

  if (isLegacySha256Record(stored)) {
    const ok = await verifyLegacySha256(pin, stored);
    if (!ok) return { ok: false, needsMigration: false };
    const upgraded = await hashPin(pin);
    return { ok: true, needsMigration: true, upgradedRecord: upgraded };
  }

  const record = parsePinRecord(stored);
  if (!record) return { ok: false, needsMigration: false };

  const normalized = normalizePin(pin);
  if (!isValidPin(normalized)) return { ok: false, needsMigration: false };

  const derived = await derivePbkdf2(normalized, fromHex(record.salt), record.iter);
  const ok = constantTimeEqualHex(toHex(derived), record.hash);
  return { ok, needsMigration: false };
};

/**
 * @deprecated Use verifyPin. Kept temporarily so call sites can migrate gradually.
 */
export const verifyPinHash = async (pin: unknown, stored: unknown): Promise<boolean> =>
  (await verifyPin(pin, stored)).ok;
