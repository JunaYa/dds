import { createContext } from "react";
import type { ThemePreference } from "../storage/preferences";

export const ThemeContext = createContext<{
  preference: ThemePreference;
  resolved: "light" | "dark";
  error: string;
  changeTheme: (theme: ThemePreference) => void;
} | null>(null);
