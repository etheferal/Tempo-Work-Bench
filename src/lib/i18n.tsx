"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCALES, LOCALE_COOKIE, translate, type Locale, type TranslationKey } from "./dictionary";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key, vars) => translate("en", key, vars),
});

/**
 * Client-side i18n. The initial locale comes from a cookie read on the
 * server, so SSR and hydration always agree — no flash, no mismatch.
 * Switching writes the cookie back and re-renders the whole tree.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    LOCALES.includes(initialLocale) ? initialLocale : "en"
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies unavailable — in-memory only */
    }
    document.documentElement.lang = next;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
