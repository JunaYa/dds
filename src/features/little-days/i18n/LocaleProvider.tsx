import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translator, type Locale } from "./translate";
import { LocaleContext } from "./LocaleContext";
import { LOCALE_KEY, readLocale, parseLocale } from "../storage/locale";

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
