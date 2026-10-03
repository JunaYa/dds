import type { Locale } from "../i18n/translate";

export const LOCALE_KEY = "little-days.locale";
function deviceLocale(): Locale {
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}
export function parseLocale(value: string | null): Locale {
  return value === "en" || value === "zh-CN" ? value : deviceLocale();
}
export function readLocale(): Locale {
  try {
    return parseLocale(localStorage.getItem(LOCALE_KEY));
  } catch {
    return deviceLocale();
  }
}
