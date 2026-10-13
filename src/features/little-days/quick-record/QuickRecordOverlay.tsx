import { useEffect, useRef, useState } from "react";
import { Button } from "@vita/ui/button";
import { Dialog, DialogPopup, DialogTitle, DialogDescription } from "@vita/ui/dialog";
import { Sheet, SheetPopup, SheetTitle, SheetDescription } from "@vita/ui/sheet";
import { useQuickRecord } from "./QuickRecordContext";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { typeName } from "../i18n/record-labels";
import { RecordForm } from "../components/records/RecordForm";
import { SaveError } from "../components/common/SaveError";
import { QuickRecordWidgets } from "./QuickRecordWidgets";
import { isNight } from "./night-status";

function Recorder({ night, onToggleNight }: { night: boolean; onToggleNight: () => void }) {
  const { close, error } = useQuickRecord();
  const a = useApp();
  const { tr } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const [child] = useState(a.activeChild);
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(() =>
    a.types.find((item) => item.id === "feed")?.id ?? a.types[0]?.id,
  );
  const [choosing, setChoosing] = useState(true);
  const [editing, setEditing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [formOpenedAt, setFormOpenedAt] = useState(() => new Date());
  const [recorder, setRecorder] = useState<HTMLDivElement | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const type = a.types.find((type) => type.id === selected);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (choosing && !editing) {
      (grid.current?.querySelector<HTMLButtonElement>('[aria-current="true"]') ??
        grid.current?.querySelector<HTMLButtonElement>('button[data-record-type]:not(:disabled)'))?.focus({ preventScroll: true });
    }
  }, [choosing, highlighted, editing]);
  function pick(id: string) { setFormOpenedAt(new Date()); setCompleted(false); setHighlighted(id); setSelected(id); setChoosing(false); }
  return (
    <div ref={setRecorder} className="quick-recorder" data-editing={editing || undefined} onKeyDown={(event) => {
      if (event.defaultPrevented || event.nativeEvent.isComposing || event.repeat || grid.current?.querySelector('[data-dragging]')) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!choosing) setChoosing(true);
        else if (editing) setEditing(false);
        else void close();
        return;
      }
      if (editing || !choosing || !child || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      const index = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
      if (index >= 0 && a.types[index]) { event.preventDefault(); pick(a.types[index].id); }
    }}>
      <header className="quick-recorder-header">
        <div>
          <DialogTitle>{tr("Quick recording")}</DialogTitle>
          <DialogDescription>{child ? tr("Recording for {name}.", { name: child.name }) : tr("Add a child in the main app to start recording.")}</DialogDescription>
        </div>
        <div className="quick-recorder-actions">
          <Button variant="ghost" aria-pressed={editing} onClick={() => setEditing((value) => !value)}>{tr(editing ? "Done editing" : "Edit widgets")}</Button>
          <Button variant="ghost" className="quick-recorder-night-toggle" aria-pressed={night} onClick={onToggleNight}>{tr("Night view")}</Button>
          <Button variant="ghost" onClick={() => void close()}>{tr("Close")} <kbd>Esc</kbd></Button>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {choosing && <SaveError />}
      <p role="status" className="quick-recorder-status">{completed ? a.notice : '\u00a0'}</p>
      <QuickRecordWidgets child={child?.id} now={now} night={night} editing={editing}
        highlighted={highlighted} onHighlight={setHighlighted} onPick={pick} grid={grid} />
      {child && a.data && <>
        <Sheet open={!choosing} onOpenChange={(open) => { if (!open) setChoosing(true); }}>
          <SheetPopup ref={sheet} side="bottom" className="quick-record-sheet" showCloseButton={false}
            portalProps={{ container: recorder, keepMounted: true }}
            initialFocus={() => sheet.current?.querySelector<HTMLElement>(".record-fields input, .record-fields select, .record-fields textarea, .growth-fields input") ?? true}
            finalFocus={() => grid.current?.querySelector<HTMLButtonElement>('[aria-current="true"]') ?? false}>
            {type && <div className="quick-recorder-form">
              <header className="quick-record-sheet-heading">
                <SheetTitle>{typeName(type, tr)}</SheetTitle>
                <Button variant="ghost" onClick={() => setChoosing(true)}>{tr("Close form")} <kbd>Esc</kbd></Button>
              </header>
              <SheetDescription>{tr("Enter to save · Command/Control + Enter from notes · Esc to go back")}</SheetDescription>
              <SaveError />
              <RecordForm key={type.id} type={type} child={child.id} defaultTime={formOpenedAt} inline focusContent={!choosing} onComplete={() => { setCompleted(true); setChoosing(true); }} />
            </div>}
          </SheetPopup>
        </Sheet>
      </>}
    </div>
  );
}

export function QuickRecordOverlay() {
  const { open } = useQuickRecord();
  const [nightPreference, setNightPreference] = useState<boolean | null>(null);
  const night = nightPreference ?? isNight(new Date());
  return (
    <Dialog open={open}>
      <DialogPopup className={`quick-recorder-popup${night ? " dark quick-recorder-night" : ""}`} style={{ scale: 'none', opacity: 1 }} showCloseButton={false} bottomStickOnMobile={false}
        onKeyDown={(event) => {
          // Let the drag sensor receive arrows, Space and Escape before the modal handles them.
          if (event.currentTarget.querySelector('[data-dragging]')) event.preventBaseUIHandler();
        }}>
        {open && <Recorder night={night} onToggleNight={() => setNightPreference(!night)} />}
      </DialogPopup>
    </Dialog>
  );
}
