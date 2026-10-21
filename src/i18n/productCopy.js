import { ONBOARDING_TEXT } from './onboardingText.js';
import { SECONDARY_COPY } from './secondaryCopy.js';

export const PRODUCT_COPY = {
  ru: {
    ...(ONBOARDING_TEXT.ru || {}),
    ...(SECONDARY_COPY.ru || {}),
  },
  en: {
    ...(ONBOARDING_TEXT.en || {}),
    ...(SECONDARY_COPY.en || {}),
  },
};
