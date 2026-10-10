import { useEffect, useRef, useState } from "react";
import { Button } from "@vita/ui/button";
import { Dialog, DialogPopup, DialogTitle, DialogDescription } from "@vita/ui/dialog";
import { Sheet, SheetPopup, SheetTitle, SheetDescription } from "@vita/ui/sheet";
import { useQuickRecord } from "./QuickRecordContext";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { typeName } from "../i18n/record-labels";
import { Icon } from "../components/common/Icon";
import { RecordForm } from "../components/records/RecordForm";
import { SaveError } from "../components/common/SaveError";

function Recorder() {
  const { close, error } = useQuickRecord();
  const a = useApp();
  const { tr, locale } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const [child] = useState(a.activeChild);
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(() =>
    a.types.find((item) => item.id === "feed")?.id ?? a.types[0]?.id,
  );
  const [choosing, setChoosing] = useState(true);
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
    if (choosing) {
      grid.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
    }
  }, [choosing, highlighted]);
  function pick(id: string) { setFormOpenedAt(new Date()); setCompleted(false); setHighlighted(id); setSelected(id); setChoosing(false); }
  return (
    <div ref={setRecorder} className="quick-recorder" onKeyDown={(event) => {
      if (event.defaultPrevented || event.nativeEvent.isComposing || event.repeat) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!choosing) setChoosing(true);
        else void close();
        return;
      }
      if (!choosing || !child || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
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
        <Button variant="ghost" onClick={() => void close()}>{tr("Close")} <kbd>Esc</kbd></Button>
      </header>
      <div className="quick-recorder-clock">
        <time dateTime={now.toISOString()}>{now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false })}</time>
        <p>{now.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {choosing && <SaveError />}
      {completed && <p role="status" className="quick-recorder-help">{a.notice}</p>}
      {child && a.data && <>
        <section aria-label={tr("Choose a record type")}>
          <p className="quick-recorder-help">{tr("Press 1–9 to choose a record type")}</p>
          <p className="quick-recorder-help">{tr("Arrow keys to select · Enter to open")}</p>
          <div ref={grid} className="quick-recorder-types" onKeyDown={(event) => {
            if (event.defaultPrevented || event.nativeEvent.isComposing ||
                event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            const buttons = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            if (index < 0) return;
            event.preventDefault();
            const nextRow = buttons.findIndex((button) => button.offsetTop > buttons[0].offsetTop);
            const columns = nextRow > 0 ? nextRow : buttons.length;
            let next = index;
            if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
            if (event.key === "ArrowRight") next = Math.min(buttons.length - 1, index + 1);
            if (event.key === "ArrowUp" && index >= columns) next = index - columns;
            if (event.key === "ArrowDown" && Math.floor(index / columns) < Math.floor((buttons.length - 1) / columns)) {
              next = Math.min(buttons.length - 1, index + columns);
            }
            buttons[next]?.focus();
          }}>
            {a.types.map((item, index) => (
              <Button key={item.id} variant="outline"
                aria-current={highlighted === item.id ? "true" : undefined}
                tabIndex={highlighted === item.id ? 0 : -1}
                onFocus={() => setHighlighted(item.id)}
                onClick={() => pick(item.id)}>
                <Icon name={item.icon} />
                <span>{typeName(item, tr)}</span>
                {index < 9 && <kbd>{index + 1}</kbd>}
              </Button>
            ))}
          </div>
        </section>
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
  return (
    <Dialog open={open}>
      <DialogPopup className="quick-recorder-popup" style={{ scale: 1, opacity: 1 }} showCloseButton={false} bottomStickOnMobile={false}>
        {open && <Recorder />}
      </DialogPopup>
    </Dialog>
  );
}
