import { messages } from "./messages";
export type Locale = "en" | "zh-CN";
export type Params = Record<string, string | number>;
export type Translate = (key: string, params?: Params) => string;
export function translator(locale: Locale): Translate {
  return (key, params = {}) =>
    (locale === "zh-CN" ? (messages[key] ?? key) : key).replace(
      /\{(\w+)\}/g,
      (match, name: string) => String(params[name] ?? match),
    );
}
