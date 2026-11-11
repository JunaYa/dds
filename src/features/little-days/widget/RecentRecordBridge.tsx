import { useEffect, useEffectEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isIosApp } from "../components/layout/ios-platform";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { typeName } from "../i18n/record-labels";

type WidgetRequest = { id: string; child: string; type: string };

export function RecentRecordBridge() {
  const app = useApp();
  const { data, modal, nursingOpen } = app;
  const { tr, locale } = useI18n();
  useEffect(() => {
    if (!isIosApp() || !data) return;
    const latest: Record<string, Record<string, number>> = Object.create(null);
    for (const record of data.records) {
      const time = new Date(record.time).getTime() / 1000;
      if (!Number.isFinite(time)) continue;
      const times = latest[record.child] ??= Object.create(null);
      if (times[record.type] === undefined || time > times[record.type]) times[record.type] = time;
    }
    void invoke("plugin:native-navigation|updateWidgetSnapshot", {
      children: data.children.map(({ id, name }) => ({ id, name })),
      currentChild: data.child, types: data.types.map(type => ({ id: type.id, name: typeName(type, tr) })),
      locale, latest,
    }).catch(error => console.error("Could not update recent record widget", error));
  }, [data, locale, tr]);

  const open = useEffectEvent((request: WidgetRequest) => {
    const child = request.child;
    const type = app.types.find(item => item.id === request.type);
    if (!type || !child || !app.children.some(item => item.id === child)) return true;
    if (child !== app.child && !app.setChild(child)) return false;
    app.setPage("Today");
    app.setModal({ kind: "record", type, child, record: null });
    return true;
  });
  useEffect(() => {
    if (!isIosApp() || !data || modal || nursingOpen) return;
    let disposed = false;
    let fetching = false;
    let refreshRequested = false;
    async function receive() {
      if (disposed || document.visibilityState === "hidden") return;
      if (fetching) {
        refreshRequested = true;
        return;
      }
      fetching = true;
      refreshRequested = false;
      try {
        const request = await invoke<WidgetRequest | null>("plugin:native-navigation|nextWidgetRequest");
        if (disposed || !request) return;
        if (open(request)) {
          await invoke("plugin:native-navigation|dismissWidgetRequest", { id: request.id });
        }
      } catch (error) {
        console.error("Could not open widget record request", error);
      } finally {
        fetching = false;
        if (refreshRequested) void receive();
      }
    }
    void receive();
    window.addEventListener("little-days-widget-request", receive);
    window.addEventListener("focus", receive);
    document.addEventListener("visibilitychange", receive);
    return () => {
      disposed = true;
      window.removeEventListener("little-days-widget-request", receive);
      window.removeEventListener("focus", receive);
      document.removeEventListener("visibilitychange", receive);
    };
  }, [data, modal, nursingOpen]);
  return null;
}
