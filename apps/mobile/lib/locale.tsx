// App-wide locale (language + city), persisted with expo-secure-store so the
// choice sticks across screens and app restarts.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { type Language } from '@angkorgo/shared';

const LANG_KEY = 'angkorgo.lang';
const CITY_KEY = 'angkorgo.city';
const DEFAULT_CITY = 'Phnom Penh';

type LocaleCtx = {
  lang: Language;
  setLang: (l: Language) => void;
  city: string;
  setCity: (c: string) => void;
  ready: boolean;
};

const LocaleContext = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [city, setCityState] = useState<string>(DEFAULT_CITY);
  const [ready, setReady] = useState(false);

  // Hydrate from storage once.
  useEffect(() => {
    (async () => {
      try {
        const [l, c] = await Promise.all([
          SecureStore.getItemAsync(LANG_KEY),
          SecureStore.getItemAsync(CITY_KEY),
        ]);
        if (l === 'en' || l === 'km' || l === 'zh') setLangState(l);
        if (c) setCityState(c);
      } catch {
        // ignore — fall back to defaults
      }
      setReady(true);
    })();
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    SecureStore.setItemAsync(LANG_KEY, l).catch(() => {});
  };
  const setCity = (c: string) => {
    setCityState(c);
    SecureStore.setItemAsync(CITY_KEY, c).catch(() => {});
  };

  return (
    <LocaleContext.Provider value={{ lang, setLang, city, setCity, ready }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
