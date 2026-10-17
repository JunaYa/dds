import { useEffect, useRef, useState } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";

export type SystemTab = "Today" | "Analysis" | "My";
const command = "plugin:native-navigation|";
type RecordAction = { title: string; onAdd: () => void };

export function useSystemTabs(page: SystemTab, titles: string[], blocked: boolean,
  onNavigate: (page: SystemTab) => void, theme: "light" | "dark" = "light", recordAction?: RecordAction) {
  const [active, setActive] = useState(false);
  const latest = useRef({ page, titles, blocked, onNavigate, theme, recordAction });
  latest.current = { page, titles, blocked, onNavigate, theme, recordAction };
  const sync = useRef<(() => void) | null>(null);
  const titleKey = JSON.stringify(titles);

  useEffect(() => {
    if (!window.__DDS_NATIVE_NAVIGATION__) return;
    const session = crypto.randomUUID();
    let disposed = false;
    let attached = false;
    let queue = Promise.resolve();
    const detach = () => invoke(`${command}detach`, { session }).catch((error: unknown) => {
      console.warn("Unable to detach system tabs", error);
    });
    const options = () => ({ session, page: latest.current.page,
      titles: latest.current.titles, theme: latest.current.theme, visible: !latest.current.blocked,
      addTitle: latest.current.recordAction?.title });
    const update = () => {
      if (!attached || disposed) return;
      queue = queue.then(async () => {
        if (!disposed) await invoke(`${command}updateTabs`, options());
      }).catch(async (error: unknown) => {
        console.warn("System tabs unavailable; restoring web navigation", error);
        disposed = true;
        setActive(false);
        await detach();
      });
    };
    sync.current = update;
    const onSelect = new Channel<{ page?: string; action?: string }>();
    onSelect.onmessage = ({ page: target, action }) => {
      if (!disposed && !latest.current.blocked && action === "add-record") {
        latest.current.recordAction?.onAdd();
        return;
      }
      if (!disposed && !latest.current.blocked &&
        (target === "Today" || target === "Analysis" || target === "My")) {
        latest.current.onNavigate(target);
      }
    };
    queue = invoke<{ supported: boolean }>(`${command}attachTabs`, {
      ...options(), onSelect,
    }).then(({ supported }) => {
      if (disposed || !supported) return;
      attached = true;
      setActive(true);
      update();
    }).catch((error: unknown) => {
      console.warn("System tabs unavailable; keeping web navigation", error);
    });
    return () => {
      disposed = true;
      sync.current = null;
      onSelect.onmessage = () => {};
      void queue.finally(detach).catch((error: unknown) => {
        console.warn("Unable to detach system tabs", error);
      });
    };
  }, []);
  useEffect(() => { sync.current?.(); }, [page, blocked, titleKey, theme, recordAction?.title]);
  return active;
}
