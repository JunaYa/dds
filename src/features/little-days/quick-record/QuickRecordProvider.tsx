import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { QuickRecordContext, type ShortcutStatus } from "./QuickRecordContext";

export function QuickRecordProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ShortcutStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const presenting = useRef(false);
  const configuring = useRef(false);
  const present = useCallback(async (next: boolean) => {
    if (presenting.current) return;
    presenting.current = true;
    try {
      await invoke("present_quick_record", { open: next });
      setOpen(next);
      setError("");
    } catch (reason) {
      setError(String(reason));
    } finally {
      presenting.current = false;
    }
  }, []);
  const show = useCallback(() => present(true), [present]);
  const close = useCallback(() => present(false), [present]);
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    const unlisten: (() => void)[] = [];
    async function initialize() {
      try {
        const status = await invoke<ShortcutStatus>("quick_record_status");
        if (disposed) return;
        setStatus(status);
        if (!status.supported) return;
        for (const event of ["quick-record-open", "quick-record-close"]) {
          const stop = await listen(event, () => {
            if (!disposed) void present(event === "quick-record-open");
          });
          if (disposed) stop();
          else unlisten.push(stop);
        }
      } catch (reason) {
        if (!disposed) setError(String(reason));
      }
    }
    void initialize();
    return () => { disposed = true; unlisten.forEach((stop) => stop()); };
  }, [present]);
  async function configure(shortcut: string | null) {
    if (configuring.current) return false;
    configuring.current = true;
    setBusy(true);
    try {
      setStatus(await invoke<ShortcutStatus>("set_quick_record_shortcut", { shortcut }));
      setError("");
      return true;
    } catch (reason) {
      setError(String(reason));
      return false;
    } finally {
      configuring.current = false;
      setBusy(false);
    }
  }
  return (
    <QuickRecordContext.Provider value={{ status, error, busy, open, show, close, configure }}>
      {children}
    </QuickRecordContext.Provider>
  );
}
