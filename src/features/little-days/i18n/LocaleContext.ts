import { createContext } from "react";
import type { Locale, Translate } from "./translate";

export const LocaleContext = createContext<{
  locale: Locale;
  tr: Translate;
  changeLocale: (locale: Locale) => void;
  error: string;
} | null>(null);
