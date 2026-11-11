import type { Locale } from "../i18n/translate";

export const LOCALE_KEY = "little-days.locale";
function deviceLocale(): Locale {
  for (const language of [navigator.language, ...navigator.languages]) {
    const [base, ...subtags] = language.toLowerCase().split("-");
    if (base === "zh") {
      if (subtags.includes("hans")) return "zh-CN";
      if (subtags.includes("hant")) return "zh-TW";
      return subtags.some((tag) => ["tw", "hk", "mo"].includes(tag)) ? "zh-TW" : "zh-CN";
    }
    if (base === "en") return "en";
  }
  return "en";
}
export function parseLocale(value: string | null): Locale {
  return value === "en" || value === "zh-CN" || value === "zh-TW" ? value : deviceLocale();
}
export function readLocale(): Locale {
  try {
    return parseLocale(localStorage.getItem(LOCALE_KEY));
  } catch {
    return deviceLocale();
  }
}
