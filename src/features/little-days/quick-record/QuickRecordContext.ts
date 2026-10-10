import { createContext, useContext } from "react";

export type ShortcutStatus = {
  supported: boolean;
  shortcut: string;
  enabled: boolean;
  error: string | null;
};
export const QuickRecordContext = createContext<{
  status: ShortcutStatus | null;
  error: string;
  busy: boolean;
  open: boolean;
  show: () => Promise<void>;
  close: () => Promise<void>;
  configure: (shortcut: string | null) => Promise<boolean>;
} | null>(null);

export function useQuickRecord() {
  const context = useContext(QuickRecordContext);
  if (!context) throw new Error("QuickRecordProvider is required");
  return context;
}
