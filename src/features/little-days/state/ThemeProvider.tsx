import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import {
  parseTheme,
  readTheme,
  saveTheme,
  THEME_KEY,
  type ThemePreference,
} from "../storage/preferences";
import { ThemeContext } from "./ThemeContext";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [error, setError] = useState("");
  const resolved = preference === "system"
    ? (systemDark ? "dark" : "light")
    : preference;

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => setSystemDark(media.matches);
    const syncStorage = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === THEME_KEY || event.key === null)
      ) {
        setPreference(parseTheme(event.newValue));
        setError("");
      }
    };
    syncSystem();
    media.addEventListener("change", syncSystem);
    window.addEventListener("storage", syncStorage);
    return () => {
      media.removeEventListener("change", syncSystem);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", resolved === "dark" ? "#111111" : "#fafafa",
    );
  }, [resolved]);

  function changeTheme(theme: ThemePreference) {
    setPreference(theme);
    try {
      saveTheme(theme);
      setError("");
    } catch {
      setError(
        "Theme changed for this session. Your device could not save the preference.",
      );
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, resolved, error, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
