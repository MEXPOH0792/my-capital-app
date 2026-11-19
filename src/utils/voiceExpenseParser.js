const RU_NUMBER_WORDS = new Map([
  ['ноль', 0],
  ['один', 1],
  ['одна', 1],
  ['одну', 1],
  ['одно', 1],
  ['два', 2],
  ['две', 2],
  ['двух', 2],
  ['три', 3],
  ['трех', 3],
  ['четыре', 4],
  ['пять', 5],
  ['шесть', 6],
  ['семь', 7],
  ['восемь', 8],
  ['девять', 9],
  ['десять', 10],
  ['одиннадцать', 11],
  ['двенадцать', 12],
  ['тринадцать', 13],
  ['четырнадцать', 14],
  ['пятнадцать', 15],
  ['шестнадцать', 16],
  ['семнадцать', 17],
  ['восемнадцать', 18],
  ['девятнадцать', 19],
  ['двадцать', 20],
  ['тридцать', 30],
  ['сорок', 40],
  ['пятьдесят', 50],
  ['шестьдесят', 60],
  ['семьдесят', 70],
  ['восемьдесят', 80],
  ['девяносто', 90],
  ['сто', 100],
  ['двести', 200],
  ['триста', 300],
  ['четыреста', 400],
  ['пятьсот', 500],
  ['шестьсот', 600],
  ['семьсот', 700],
  ['восемьсот', 800],
  ['девятьсот', 900],
  ['полтора', 1.5],
  ['полторы', 1.5],
]);

const EN_NUMBER_WORDS = new Map([
  ['zero', 0],
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['thirteen', 13],
  ['fourteen', 14],
  ['fifteen', 15],
  ['sixteen', 16],
  ['seventeen', 17],
  ['eighteen', 18],
  ['nineteen', 19],
  ['twenty', 20],
  ['thirty', 30],
  ['forty', 40],
  ['fifty', 50],
  ['sixty', 60],
  ['seventy', 70],
  ['eighty', 80],
  ['ninety', 90],
  ['hundred', 100],
]);

const THOUSAND_WORDS = new Set([
  'тысяча',
  'тысячи',
  'тысяч',
  'тысячу',
  'тыще',
  'тыща',
  'тыщи',
  'тыщу',
  'тыщ',
  'тыс',
  'thousand',
]);
const INCOME_WORDS = new Set([
  'доход',
  'доходы',
  'зарплата',
  'зарплату',
  'зарплаты',
  'аванс',
  'премия',
  'премию',
  'фриланс',
  'продажа',
  'продал',
  'продала',
  'получил',
  'получила',
  'поступило',
  'пришло',
  'income',
  'salary',
  'advance',
  'bonus',
  'freelance',
  'received',
  'earned',
  'sale',
]);
const EXPENSE_WORDS = new Set([
  'расход',
  'расходы',
  'потратил',
  'потратила',
  'купил',
  'купила',
  'оплатил',
  'оплатила',
  'продукты',
  'кафе',
  'такси',
  'транспорт',
  'коммуналка',
  'здоровье',
  'одежда',
  'связь',
  'досуг',
  'образование',
  'дети',
  'expense',
  'spent',
  'spend',
  'bought',
  'paid',
  'groceries',
  'cafe',
  'taxi',
  'transport',
  'utilities',
]);
const CURRENCY_AND_FILLER_WORDS = new Set([
  'рубль',
  'рубля',
  'рублей',
  'руб',
  'р',
  'копейка',
  'копейки',
  'копеек',
  'доллар',
  'доллара',
  'долларов',
  'dollar',
  'dollars',
  'ruble',
  'rubles',
  'потратил',
  'потратила',
  'потрачено',
  'расход',
  'расходы',
  'запиши',
  'добавь',
  'внеси',
  'на',
  'за',
  'с',
  'со',
  'из',
  'карты',
  'карта',
  'счета',
  'счет',
  'счёта',
  'счёт',
  'account',
  'card',
  'spent',
  'spend',
  'expense',
  'add',
  'for',
  'from',
  'доход',
  'доходы',
  'получил',
  'получила',
  'поступило',
  'пришло',
  'зачисление',
]);

const MAX_AMOUNT_MINOR = 1_000_000_000_000_000;

export const normalizeVoiceText = (value) =>
  String(value || '')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}.,]+/gu, ' ')
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/(\p{L})(\d)/gu, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ');

const normalizedLabel = (value) => normalizeVoiceText(value).replace(/[.,]/g, '');

const hasInflectedLabel = (haystack, label) => {
  const haystackTokens = normalizedLabel(haystack).split(/\s+/).filter(Boolean);
  const labelTokens = normalizedLabel(label).split(/\s+/).filter(Boolean);
  if (!labelTokens.length) return false;

  return labelTokens.every((labelToken) =>
    haystackTokens.some((haystackToken) => {
      if (haystackToken === labelToken) return true;
      if (labelToken.length < 4 || haystackToken.length < 4) return false;
      const stemLength = Math.min(5, labelToken.length - 1, haystackToken.length - 1);
      return labelToken.slice(0, stemLength) === haystackToken.slice(0, stemLength);
    }),
  );
};

const findLongestLabel = (transcript, items, getLabel) => {
  const haystack = ` ${normalizedLabel(transcript)} `;
  return [...(items || [])]
    .filter(Boolean)
    .sort((left, right) => getLabel(right).length - getLabel(left).length)
    .find((item) => {
      const needle = normalizedLabel(getLabel(item));
      return needle && (haystack.includes(` ${needle} `) || hasInflectedLabel(transcript, needle));
    });
};

const parseDigitAmount = (normalized) => {
  const matches = [
    ...normalized.matchAll(/(?:^|\s)(\d{1,3}(?:[\s.]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?=\s|$)/g),
  ];
  for (const match of matches) {
    const raw = match[1].trim();
    const groupedThousands = /^\d{1,3}(?:[\s.]\d{3})+(?:,\d{1,2})?$/.test(raw);
    const decimalMark = groupedThousands ? raw.match(/,(\d{1,2})$/) : raw.match(/[.,](\d{1,2})$/);
    const integerText = decimalMark ? raw.slice(0, decimalMark.index) : raw;
    const integer = Number(integerText.replace(/[\s.]/g, ''));
    const fraction = decimalMark ? Number(decimalMark[1].padEnd(2, '0').slice(0, 2)) / 100 : 0;
    const value = integer + fraction;
    if (Number.isFinite(value) && value > 0) {
      const matchEnd = (match.index || 0) + match[0].length;
      const suffix = normalized.slice(matchEnd).trim().split(/\s+/, 1)[0];
      return { value: THOUSAND_WORDS.has(suffix) ? value * 1000 : value, words: raw.split(/\s+/) };
    }
  }
  return null;
};

const parseWordAmount = (normalized) => {
  const tokens = normalized.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
  let best = null;

  for (let start = 0; start < tokens.length; start += 1) {
    if (
      !RU_NUMBER_WORDS.has(tokens[start]) &&
      !EN_NUMBER_WORDS.has(tokens[start]) &&
      !THOUSAND_WORDS.has(tokens[start])
    ) {
      continue;
    }

    let current = 0;
    let total = 0;
    let end = start;
    for (; end < tokens.length; end += 1) {
      const token = tokens[end];
      if (THOUSAND_WORDS.has(token)) {
        total += Math.max(1, current) * 1000;
        current = 0;
        continue;
      }

      const value = RU_NUMBER_WORDS.get(token) ?? EN_NUMBER_WORDS.get(token);
      if (value === undefined) break;
      if (token === 'hundred') current = Math.max(1, current) * 100;
      else current += value;
    }

    const value = total + current;
    if (value > 0 && (!best || end - start > best.words.length)) {
      best = { value, words: tokens.slice(start, end) };
    }
  }

  return best;
};

const removePhrase = (text, phrase) => {
  const normalizedPhrase = normalizedLabel(phrase);
  if (!normalizedPhrase) return text;
  return ` ${text} `.replace(` ${normalizedPhrase} `, ' ').trim().replace(/\s+/g, ' ');
};

const deriveCustomCategory = (normalized, amountWords, accountName) => {
  let remainder = normalizedLabel(normalized);
  if (accountName) remainder = removePhrase(remainder, accountName);
  for (const word of amountWords || []) remainder = removePhrase(remainder, word);

  const meaningful = remainder
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !CURRENCY_AND_FILLER_WORDS.has(word))
    .filter((word) => !THOUSAND_WORDS.has(word) && !RU_NUMBER_WORDS.has(word) && !EN_NUMBER_WORDS.has(word))
    .filter((word) => !/^\d/.test(word));

  if (!meaningful.length) return '';
  const value = meaningful.slice(0, 6).join(' ');
  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1);
};

const hasNegativeAmount = (transcript) => {
  const raw = String(transcript || '').toLocaleLowerCase('ru-RU');
  return /(?:^|\s)[−-]\s*\d/u.test(raw) || /(?:^|\s)(?:минус|minus|negative)(?=\s|$)/u.test(raw);
};

const toMinorUnits = (amount) => {
  const value = Number(amount?.value || 0);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT_MINOR / 100) return 0;
  return Math.round(value * 100);
};

const containsAnyWord = (normalized, words) => normalized.split(/\s+/).some((word) => words.has(word));

const normalizeCategoryCandidates = (categories, fallbackType = '') =>
  (categories || [])
    .map((item) =>
      typeof item === 'string'
        ? { type: fallbackType, name: item }
        : { type: String(item?.type || fallbackType), name: String(item?.name || '') },
    )
    .filter((item) => item.name);

const detectTransactionType = (normalized, categories) => {
  let income = containsAnyWord(normalized, INCOME_WORDS);
  let expense = containsAnyWord(normalized, EXPENSE_WORDS);

  for (const category of categories) {
    if (!hasInflectedLabel(normalized, category.name)) continue;
    if (category.type === 'income') income = true;
    if (category.type === 'expense') expense = true;
  }

  if (income && expense) return 'conflict';
  if (income) return 'income';
  if (expense) return 'expense';
  return 'unknown';
};

/** Shared Web/Android voice-command contract. */
export function parseVoiceCommand(transcript, { categories = [], accounts = [] } = {}) {
  const normalized = normalizeVoiceText(transcript);
  const categoryCandidates = normalizeCategoryCandidates(categories);
  const type = detectTransactionType(normalized, categoryCandidates);
  const account = findLongestLabel(
    normalized,
    (accounts || []).filter((item) => item?.includeInSpendable !== false),
    (item) => String(item?.name || ''),
  );
  const knownCategory =
    type === 'income' || type === 'expense'
      ? findLongestLabel(
          normalized,
          categoryCandidates.filter((item) => item.type === type),
          (item) => item.name,
        )
      : null;
  const amount = parseDigitAmount(normalized) || parseWordAmount(normalized);
  const amountMinor = hasNegativeAmount(transcript) ? 0 : toMinorUnits(amount);

  return {
    type,
    amountMinor,
    category: knownCategory?.name || deriveCustomCategory(normalized, amount?.words, account?.name),
    accountId: account?.id || '',
  };
}

/**
 * Turns a short voice command into fields understood by the existing expense
 * form. Known categories/accounts win over inferred free text.
 */
export function parseVoiceExpense(transcript, { categories = [], accounts = [] } = {}) {
  const normalized = normalizeVoiceText(transcript);
  const category = findLongestLabel(normalized, categories, (item) => String(item));
  const account = findLongestLabel(normalized, accounts, (item) => String(item?.name || ''));
  const command = parseVoiceCommand(transcript, {
    categories: normalizeCategoryCandidates(categories, 'expense'),
    accounts,
  });

  return {
    transcript: String(transcript || '').trim(),
    amountMinor: command.amountMinor,
    categoryPreset: category || '',
    customCategory: category ? '' : command.category,
    accountId: account?.id || '',
  };
}
