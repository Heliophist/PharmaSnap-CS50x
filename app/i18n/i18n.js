//i18n.js, under the folder "app"

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import tl from './locales/tl.json';
import vi from './locales/vi.json';
import ko from './locales/ko.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import de from './locales/de.json';
import fa from './locales/fa.json';
import th from './locales/th.json';
import ru from './locales/ru.json';

// Configure language detection
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: callback => {
    const locales = RNLocalize.getLocales();
    callback(locales[0]?.languageCode);
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

// Initialize i18next
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: {translation: en},
      es: {translation: es},
      zh: {translation: zh},
      tl: {translation: tl},
      vi: {translation: vi},
      ko: {translation: ko},
      ar: {translation: ar},
      hi: {translation: hi},
      fr: {translation: fr},
      pt: {translation: pt},
      ja: {translation: ja},
      de: {translation: de},
      fa: {translation: fa},
      th: {translation: th},
      ru: {translation: ru},
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
