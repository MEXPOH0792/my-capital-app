import { ADVISOR_TEXT } from './advisorText.js';
import { HOME_TEXT } from './homeText.js';
import { MISC_TEXT } from './miscText.js';
import { NAV_TEXT } from './navText.js';
import { SETTINGS_TEXT } from './settingsText.js';

export const UI_TEXT = {
  ru: {
    ...NAV_TEXT.ru,
    ...HOME_TEXT.ru,
    ...SETTINGS_TEXT.ru,
    ...ADVISOR_TEXT.ru,
    ...MISC_TEXT.ru,
  },
  en: {
    ...NAV_TEXT.en,
    ...HOME_TEXT.en,
    ...SETTINGS_TEXT.en,
    ...ADVISOR_TEXT.en,
    ...MISC_TEXT.en,
  },
};
