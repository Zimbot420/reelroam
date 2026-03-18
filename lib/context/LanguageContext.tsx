import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALL_TRANSLATIONS,
  interpolate,
  LANGUAGES,
  LanguageCode,
  LanguageMeta,
  Translations,
} from '../i18n/translations';

const STORAGE_KEY = '@reelroam_language';
const DEFAULT_LANGUAGE: LanguageCode = 'en';

interface LanguageContextValue {
  language: LanguageCode;
  langMeta: LanguageMeta;
  t: Translations;
  setLanguage: (code: LanguageCode) => Promise<void>;
  interpolate: typeof interpolate;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  langMeta: LANGUAGES[0],
  t: ALL_TRANSLATIONS[DEFAULT_LANGUAGE],
  setLanguage: async () => {},
  interpolate,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in ALL_TRANSLATIONS) {
        setLanguageState(saved as LanguageCode);
      }
    });
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    setLanguageState(code);
    await AsyncStorage.setItem(STORAGE_KEY, code);
  }, []);

  const langMeta = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        langMeta,
        t: ALL_TRANSLATIONS[language],
        setLanguage,
        interpolate,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
