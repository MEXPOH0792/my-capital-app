export const MONEY_SCALE = 100;
export const MONEY_VERSION = 2;
export const DEFAULT_CURRENCY = 'RUB';

export const SUPPORTED_CURRENCIES = [
  'RUB',
  'USD',
  'GBP',
  'EUR',
  'BYN',
  'KZT',
  'KGS',
  'AMD',
  'AZN',
  'TJS',
  'TMT',
  'UZS',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type SupportedLanguage = 'ru' | 'en';

export interface CurrencyOption {
  code: SupportedCurrency;
  label: string;
}

export const SUPPORTED_CURRENCY_OPTIONS: Record<SupportedLanguage, CurrencyOption[]> = {
  ru: [
    { code: 'RUB', label: 'Российский рубль' },
    { code: 'USD', label: 'Доллар США' },
    { code: 'GBP', label: 'Британский фунт' },
    { code: 'EUR', label: 'Евро' },
    { code: 'BYN', label: 'Белорусский рубль' },
    { code: 'KZT', label: 'Казахстанский тенге' },
    { code: 'KGS', label: 'Киргизский сом' },
    { code: 'AMD', label: 'Армянский драм' },
    { code: 'AZN', label: 'Азербайджанский манат' },
    { code: 'TJS', label: 'Таджикский сомони' },
    { code: 'TMT', label: 'Туркменский манат' },
    { code: 'UZS', label: 'Узбекский сум' },
  ],
  en: [
    { code: 'RUB', label: 'Russian ruble' },
    { code: 'USD', label: 'US dollar' },
    { code: 'GBP', label: 'British pound' },
    { code: 'EUR', label: 'Euro' },
    { code: 'BYN', label: 'Belarusian ruble' },
    { code: 'KZT', label: 'Kazakh tenge' },
    { code: 'KGS', label: 'Kyrgyz som' },
    { code: 'AMD', label: 'Armenian dram' },
    { code: 'AZN', label: 'Azerbaijani manat' },
    { code: 'TJS', label: 'Tajikistani somoni' },
    { code: 'TMT', label: 'Turkmen manat' },
    { code: 'UZS', label: 'Uzbek sum' },
  ],
};

export const MIN_TARGET_MAJOR = 10000;
export const PREVIEW_INCOME_MAJOR = 50000;
export const MIN_TARGET_MINOR = MIN_TARGET_MAJOR * MONEY_SCALE;

const SUPPORTED_CURRENCIES_SET: ReadonlySet<string> = new Set(SUPPORTED_CURRENCIES);

export const sanitizeCurrencyCode = (
  value: unknown,
  fallback: SupportedCurrency | '' = DEFAULT_CURRENCY,
): SupportedCurrency | '' => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return SUPPORTED_CURRENCIES_SET.has(normalized) ? (normalized as SupportedCurrency) : fallback;
};

export const toMinorUnits = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * MONEY_SCALE) : 0;
};

export const fromMinorUnits = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount / MONEY_SCALE : 0;
};

/**
 * Largest amount the app accepts: 10 trillion in major units. Well inside
 * Number.MAX_SAFE_INTEGER, so sums of many such amounts stay exact.
 */
export const MAX_AMOUNT_MINOR = 1e15;

export const isAmountTooLarge = (minor: unknown): boolean => Number(minor) > MAX_AMOUNT_MINOR;

/** A non-negative whole amount in minor units; anything above the limit is refused as 0. */
export const toSafeMinorAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount > MAX_AMOUNT_MINOR) return 0;
  return Math.max(0, Math.round(amount));
};

export const toSafeSignedMinorAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
};

export const toImportedMinorAmount = (value: unknown, isMinorState: boolean = false): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, isMinorState ? Math.round(amount) : toMinorUnits(amount));
};

export const toImportedSignedMinorAmount = (value: unknown, isMinorState: boolean = false): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return isMinorState ? Math.round(amount) : toMinorUnits(amount);
};

export const sanitizeMoneyInput = (value: unknown, locale: string = 'ru-RU'): string => {
  const decimalSeparator = locale.startsWith('en') ? '.' : ',';
  const groupIntegerPart = (rawValue: string): string =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(Number(rawValue || '0'))
      .replace(/\u00A0/g, ' ');
  const source = String(value ?? '');
  const normalized = source
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');

  if (!normalized) return '';

  const [integerPartRaw = '', ...fractionParts] = normalized.split('.');
  // Beyond 16 digits Number loses precision; the limit check then reports
  // "too large" instead of silently rounding what was typed.
  const integerPart = (integerPartRaw.replace(/^0+(?=\d)/, '') || integerPartRaw || '0').slice(0, 16);
  const groupedIntegerPart = groupIntegerPart(integerPart);
  const fractionPart = fractionParts.join('').slice(0, 2);
  const hasTrailingSeparator = /[.,]$/.test(source);

  if (fractionPart) {
    return `${groupedIntegerPart}${decimalSeparator}${fractionPart}`;
  }

  return hasTrailingSeparator ? `${groupedIntegerPart}${decimalSeparator}` : groupedIntegerPart;
};

export const parseMoneyInputToMinor = (value: unknown): number => {
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');

  if (!normalized) return 0;

  const [integerPartRaw = '0', ...fractionParts] = normalized.split('.');
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const fractionRaw = fractionParts.join('');
  const fractionPart = `${fractionRaw}00`.slice(0, 2);

  return parseInt(integerPart, 10) * MONEY_SCALE + parseInt(fractionPart, 10);
};

export const formatMinorAsInput = (value: unknown, locale: string = 'ru-RU'): string => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(fromMinorUnits(amount))
    .replace(/\u00A0/g, ' ');
};

export const formatMinorAsCurrency = (
  value: unknown,
  locale: string = 'ru-RU',
  currency: string = DEFAULT_CURRENCY,
): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: sanitizeCurrencyCode(currency) || DEFAULT_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(fromMinorUnits(value));

export type PercentMap = Record<string, number>;

export const splitMinorByPercents = (amount: unknown, percents: PercentMap | null | undefined): PercentMap => {
  const safeAmount = toSafeMinorAmount(amount);
  const entries = Object.entries(percents || {});
  if (entries.length === 0) return {};

  const rawParts = entries.map(([key, percent]) => {
    const exact = safeAmount * (Math.max(0, Number(percent) || 0) / 100);
    const base = Math.floor(exact);
    return { key, base, remainder: exact - base };
  });

  const allocated = rawParts.reduce((sum, item) => sum + item.base, 0);
  let leftover = safeAmount - allocated;

  rawParts
    .slice()
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((item) => {
      if (leftover <= 0) return;
      item.base += 1;
      leftover -= 1;
    });

  return rawParts.reduce<PercentMap>((acc, item) => {
    acc[item.key] = item.base;
    return acc;
  }, {});
};
