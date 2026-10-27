import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@vita/ui/button";
import { NativeSelect } from "@vita/ui/select";
import { Dialog, DialogPopup, DialogHeader, DialogTitle, DialogDescription } from "@vita/ui/dialog";
import { isIosApp } from "../components/layout/ios-platform";
import { RecordForm } from "../components/records/RecordForm";
import { SaveError } from "../components/common/SaveError";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { siriDraft, siriRequestSchema, type SiriRequest } from "./request";

export function SiriRecordReceiver() {
  const a = useApp();
  const { tr } = useI18n();
  const [request, setRequest] = useState<SiriRequest | null>(null);
  const [child, setChild] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const fetching = useRef(false);
  const dismissing = useRef(false);
  const [saved, setSaved] = useState(false);
  const eligible = isIosApp() && !!a.data && !!a.activeChild && !a.modal && !a.nursingOpen && !a.sharedBackup;
  useEffect(() => {
    if (!eligible || request) return;
    let disposed = false;
    const refresh = async () => {
      if (fetching.current || document.visibilityState === "hidden") return;
      fetching.current = true;
      try {
        const raw = await invoke<unknown>("plugin:native-navigation|nextSiriRequest");
        if (!raw || disposed) return;
        const item = siriRequestSchema.parse(raw);
        if (a.data?.records.some(r => r.source?.format === "siri" && r.source.data.requestId === item.id)) {
          await invoke("plugin:native-navigation|dismissSiriRequest", { id: item.id });
        } else {
          setChild(a.children.length === 1 ? a.children[0].id : "");
          setSaved(false); setError(false); setRequest(item);
        }
      } catch (cause) {
        if (!disposed) setError(true);
        console.error("Could not receive Siri request", cause);
      } finally { fetching.current = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true; clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [eligible, request, a.data, a.children]);

  async function dismiss() {
    if (!request || dismissing.current) return;
    dismissing.current = true; setBusy(true);
    try {
      await invoke("plugin:native-navigation|dismissSiriRequest", { id: request.id });
      setRequest(null); setError(false);
    } catch { setError(true); }
    finally { dismissing.current = false; setBusy(false); }
  }
  const type = a.types.find(t => t.id === request?.kind);
  const draft = request && type ? siriDraft(request, type) : null;
  const selectedChild = a.children.some(c => c.id === child);
  return <>
    {error && !request && <p role="alert">{tr("Could not read Siri requests. Reopen the app to retry.")}</p>}
    <Dialog open={!!request && eligible} onOpenChange={open => { if (!open) void dismiss(); }}>
      <DialogPopup className="care-dialog" showCloseButton={false} initialFocus={false}>
        <DialogHeader>
          <DialogTitle>{tr("Confirm Siri record")}</DialogTitle>
          <DialogDescription>{tr("Choose a child and check the details before saving.")}</DialogDescription>
        </DialogHeader>
        <SaveError />
        {error && <p role="alert">{tr("Could not dismiss this request. Try again.")}</p>}
        {saved ? <p role="status">{tr("Record saved")}</p> : !draft || !type ? (
          <p role="alert">{tr("This record type has changed. Create this record manually.")}</p>
        ) : <>
          <label>{tr("Child")}
            <NativeSelect value={child} onChange={e => setChild(e.target.value)}>
              <option value="">{tr("Choose a child")}</option>
              {a.children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </label>
          {selectedChild && <RecordForm key={`${request?.id}:${child}`} type={type} child={child} inline draft={draft}
            onComplete={() => { setSaved(true); void dismiss(); }} />}
        </>}
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void dismiss()}>
          {tr(saved ? "Close" : "Cancel")}
        </Button>
      </DialogPopup>
    </Dialog>
  </>;
}
