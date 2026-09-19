export type ThemePreference = "system" | "light" | "dark";
export const THEME_KEY = "little-days.theme";

export function parseTheme(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function readTheme(): ThemePreference {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

export function saveTheme(theme: ThemePreference) {
  localStorage.setItem(THEME_KEY, theme);
}
