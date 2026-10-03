import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translator, type Locale, type Translate } from "./translate";
export const LOCALE_KEY = "little-days.locale";
function deviceLocale(): Locale {
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}
function parseLocale(value: string | null): Locale {
  return value === "en" || value === "zh-CN" ? value : deviceLocale();
}
function readLocale(): Locale {
  try {
    return parseLocale(localStorage.getItem(LOCALE_KEY));
  } catch {
    return deviceLocale();
  }
}
const LocaleContext = createContext<{
  locale: Locale;
  tr: Translate;
  changeLocale: (locale: Locale) => void;
  error: string;
}>({ locale: "en", tr: translator("en"), changeLocale: () => {}, error: "" });
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(readLocale);
  const [error, setError] = useState("");
  const tr = useMemo(() => translator(locale), [locale]);
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === LOCALE_KEY || event.key === null)
      ) {
        setLocale(parseLocale(event.newValue));
        setError("");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function changeLocale(next: Locale) {
    setLocale(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
      setError("");
    } catch {
      setError(
        "Language changed for this session. Your device could not save the preference.",
      );
    }
  }
  return (
    <LocaleContext.Provider value={{ locale, tr, changeLocale, error }}>
      {children}
    </LocaleContext.Provider>
  );
}
export function useI18n() {
  return useContext(LocaleContext);
}
