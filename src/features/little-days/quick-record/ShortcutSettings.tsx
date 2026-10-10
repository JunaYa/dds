import { useEffect, useState } from "react";
import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
import { useQuickRecord } from "./QuickRecordContext";
import { useI18n } from "../i18n/useI18n";

export function ShortcutSettings() {
  const { status, busy, error, configure, show } = useQuickRecord();
  const { tr } = useI18n();
  const [shortcut, setShortcut] = useState("");
  useEffect(() => { if (status) setShortcut(status.shortcut); }, [status]);
  if (!status?.supported) return error ? <p role="alert">{error}</p> : null;
  return (
    <section className="settings-section shortcut-settings">
      <h2>{tr("Desktop quick recording")}</h2>
      <p>{tr("Wake a full-screen recorder from any app. Little days must be running.")}</p>
      <form onSubmit={(event) => { event.preventDefault(); void configure(shortcut); }}>
        <label className="form-field">
          {tr("Global shortcut")}
          <Input
            value={shortcut
              .replace("CommandOrControl", "⌘ / Ctrl")
              .replace("Super", "⌘")
              .replace("Control", "Ctrl")
              .replace(/\b(?:Key|Digit)(?=[A-Z0-9])/g, "")
              .split("+").join(" + ")}
            readOnly
            disabled={busy}
            placeholder={tr("Press a key combination")}
            onKeyDown={(event) => {
              if (["Tab", "Escape", "Enter"].includes(event.key)) return;
              event.preventDefault();
              if (event.repeat || event.nativeEvent.isComposing) return;
              const key = event.code === "Space" ? "Space"
                : /^(Key[A-Z]|Digit[0-9]|F\d{1,2})$/.test(event.code) ? event.code : null;
              if (!key || !(event.metaKey || event.ctrlKey || event.altKey)) return;
              setShortcut([
                event.metaKey && "Super", event.ctrlKey && "Control",
                event.altKey && "Alt", event.shiftKey && "Shift", key,
              ].filter(Boolean).join("+"));
            }}
          />
        </label>
        <p>{tr("Click the field, then press Control, Command or Alt with another key.")}</p>
        <div className="shortcut-actions">
          <Button type="submit" disabled={busy || !shortcut}>{tr("Save shortcut")}</Button>
          <Button type="button" variant="outline" disabled={busy || !status.enabled} onClick={() => void configure(null)}>{tr("Disable shortcut")}</Button>
          <Button type="button" variant="ghost" onClick={() => void show()}>{tr("Open quick recorder")}</Button>
        </div>
      </form>
      <p role="status">{status.enabled ? tr("Shortcut enabled") : tr("Shortcut disabled")}</p>
      {(error || status.error) && <p role="alert">{tr("Could not activate the shortcut. Try another combination.")} {error || status.error}</p>}
    </section>
  );
}
