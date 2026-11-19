// Presentation only: never rewrite persisted category names or financial types.
const groups = [
  ['groceries', ['продукты', 'еда', 'супермаркет', 'groceries', 'food']],
  ['cafe', ['кафе', 'кофе', 'ресторан', 'cafe', 'café', 'coffee', 'restaurant']],
  ['transport', ['транспорт', 'такси', 'бензин', 'transport', 'taxi', 'fuel']],
  ['home', ['дом', 'жилье', 'аренда', 'home', 'rent', 'housing']],
  ['utilities', ['коммуналка', 'жкх', 'utilities']],
  ['health', ['здоровье', 'аптека', 'health', 'pharmacy']],
  ['education', ['образование', 'учеба', 'education', 'study']],
  ['shopping', ['покупки', 'одежда', 'shopping', 'clothing']],
  ['charity', ['садака', 'садака (авто)', 'благотворительность', 'sadaka', 'sadaqah', 'charity']],
  ['mobile', ['связь', 'телефон', 'интернет', 'mobile', 'phone', 'internet']],
  ['leisure', ['досуг', 'развлечения', 'leisure', 'entertainment']],
  ['kids', ['дети', 'kids', 'children']],
  ['gift', ['подарки', 'подарок', 'gift', 'gifts']],
  ['salary', ['зарплата', 'аванс', 'премия', 'salary', 'advance', 'bonus']],
  ['business', ['бизнес', 'фриланс', 'business', 'freelance']],
  ['interest', ['проценты', 'interest']],
  ['sale', ['продажа', 'sale']],
];
const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('ё', 'е');
const categories = new Map(groups.flatMap(([key, names]) => names.map((name) => [normalize(name), key])));

export const CATEGORY_APPEARANCES = Object.freeze([
  'groceries',
  'cafe',
  'transport',
  'home',
  'utilities',
  'health',
  'education',
  'shopping',
  'charity',
  'mobile',
  'leisure',
  'kids',
  'gift',
  'salary',
  'business',
  'interest',
  'sale',
  'income',
  'transfer',
  'debt',
  'other',
  'reserve',
  'capital',
  'wallet',
]);

export const CATEGORY_PICKER_APPEARANCES = Object.freeze(
  CATEGORY_APPEARANCES.filter(
    (value) => !['income', 'transfer', 'debt', 'reserve', 'capital', 'wallet'].includes(value),
  ),
);

export const isCategoryAppearance = (value) => CATEGORY_APPEARANCES.includes(value);

export function getSavedCategoryAppearance(transactions, category, type = 'expense') {
  const normalizedCategory = normalize(category);
  if (!normalizedCategory || !Array.isArray(transactions)) return '';
  const transaction = transactions.find(
    (item) =>
      item?.type === type &&
      normalize(item.category) === normalizedCategory &&
      isCategoryAppearance(item.meta?.categoryAppearance),
  );
  return transaction?.meta?.categoryAppearance || '';
}

export function getCategoryAppearance(category, type = 'expense') {
  if (type === 'transfer') return 'transfer';
  if (type === 'debt') return 'debt';
  return categories.get(normalize(category)) || (type === 'income' ? 'income' : 'other');
}
