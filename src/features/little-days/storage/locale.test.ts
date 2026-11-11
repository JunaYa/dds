import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LOCALE_KEY, readLocale } from "./locale";

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(navigator, "languages", "get").mockReturnValue([]);
});
afterEach(() => vi.restoreAllMocks());

it.each([
  ["zh", "zh-CN"], ["zh-CN", "zh-CN"], ["zh-SG", "zh-CN"],
  ["zh-TW", "zh-TW"], ["zh-HK", "zh-TW"], ["zh-MO", "zh-TW"],
  ["zh-Hant", "zh-TW"], ["zh-Hant-CN", "zh-TW"],
  ["zh-Hans-HK", "zh-CN"], ["en-US", "en"], ["fr-FR", "en"],
])("resolves system language %s to %s", (system, expected) => {
  vi.spyOn(navigator, "language", "get").mockReturnValue(system);
  expect(readLocale()).toBe(expected);
});

it("uses the next supported system language", () => {
  vi.spyOn(navigator, "language", "get").mockReturnValue("ja-JP");
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["ja-JP", "zh-Hant", "en"]);
  expect(readLocale()).toBe("zh-TW");
});

it("prefers a saved selection over the system and handles unavailable storage", () => {
  vi.spyOn(navigator, "language", "get").mockReturnValue("zh-HK");
  localStorage.setItem(LOCALE_KEY, "zh-CN");
  expect(readLocale()).toBe("zh-CN");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Unavailable"); });
  expect(readLocale()).toBe("zh-TW");
});
