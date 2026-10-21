import { cookies } from "next/headers";
import { LOCALE_COOKIE, translate, type Locale, type TranslationKey } from "./dictionary";

/** Reads the visitor's locale from the cookie written by the client toggle. */
export function getServerLocale(): Locale {
  const store = cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "tr" ? "tr" : "en";
}

/**
 * Server-side translator for RSC pages (landing, join, …).
 * Client components use `useI18n()` instead — both hit the same dictionary.
 */
export function serverT(locale: Locale) {
  return (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
}
