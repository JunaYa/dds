import { messages } from "./messages";
import { traditionalMessages } from "./messages.zh-TW";
export type Locale = "en" | "zh-CN" | "zh-TW";
export type Params = Record<string, string | number>;
export type Translate = (key: string, params?: Params) => string;
export function translator(locale: Locale): Translate {
  const dictionary: Record<string, string> =
    locale === "zh-TW"
      ? traditionalMessages
      : locale === "zh-CN"
        ? messages
        : {};
  return (key, params = {}) =>
    (dictionary[key] ?? key).replace(
      /\{(\w+)\}/g,
      (match, name: string) => String(params[name] ?? match),
    );
}
