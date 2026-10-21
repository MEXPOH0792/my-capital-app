import { PRODUCT_COPY } from './i18n/productCopy.js';
import { UI_TEXT } from './i18n/uiText.js';

export const LOCALES = {
  ru: 'ru-RU',
  en: 'en-US',
};

export const getCopy = (language = 'ru') => ({
  ...(UI_TEXT[language] || UI_TEXT.ru),
  ...(PRODUCT_COPY[language] || PRODUCT_COPY.ru),
});
