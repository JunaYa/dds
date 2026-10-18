import { useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isIosApp } from "../components/layout/ios-platform";
import { useApp } from "../hooks/useApp";

export type SharedBackup = { id: string; name: string; text?: string; error?: string };
export async function dismissSharedBackup(id: string) {
  await invoke("plugin:native-navigation|dismissSharedBackup", { id });
}
export function SharedBackupReceiver() {
  const { sharedBackup, setSharedBackup, setPage, modal, nursingOpen, child } = useApp();
  useEffect(() => {
    if (!isTauri() || !isIosApp() || sharedBackup || modal || nursingOpen) return;
    let disposed = false;
    let fetching = false;
    let delivered = false;
    let refreshAgain = false;
    const refresh = async () => {
      if (delivered || disposed) return;
      if (fetching) { refreshAgain = true; return; }
      fetching = true;
      try {
        const item = await invoke<SharedBackup | null>("plugin:native-navigation|nextSharedBackup");
        if (item && !disposed) {
          delivered = true;
          setSharedBackup(item); setPage(child ? "My" : "Settings");
        }
      } catch (error) { console.error("Could not read shared backup inbox", error); }
      finally { fetching = false; if (refreshAgain) { refreshAgain = false; void refresh(); } }
    };
    const listener = listen("backup-inbox-changed", refresh);
    void listener.then(refresh).catch(error => console.error("Could not listen for shared backups", error));
    window.addEventListener("focus", refresh);
    const visibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      void listener.then(unlisten => unlisten()).catch(() => {});
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [sharedBackup, modal, nursingOpen, child, setPage, setSharedBackup]);
  return null;
}
