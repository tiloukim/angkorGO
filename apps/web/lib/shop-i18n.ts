'use client';
// Shared locale for the customer web shop. Reads/writes the same
// localStorage key ('angkorgo.lang') the landing page uses, so a language
// choice carries across the whole site. Each page keeps its own trilingual
// L map (like the mobile app) and indexes it by this lang.
import { useEffect, useState } from 'react';
import type { Language } from '@angkorgo/shared';

export const SHOP_LANGS: { code: Language; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'km', flag: '🇰🇭', label: 'ភាសាខ្មែរ' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

export function useShopLocale() {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const s = localStorage.getItem('angkorgo.lang');
    if (s === 'en' || s === 'km' || s === 'zh') setLangState(s);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'angkorgo.lang' && (e.newValue === 'en' || e.newValue === 'km' || e.newValue === 'zh')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    try { localStorage.setItem('angkorgo.lang', l); } catch {}
  };

  return { lang, setLang };
}
