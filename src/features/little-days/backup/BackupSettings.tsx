import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@vita/ui/button";
import { NativeInput } from "@vita/ui/input";
import { NativeSelect } from "@vita/ui/select";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import type { Workspace } from "../domain/model";
import { exportBackup, MAX_BACKUP_BYTES, planImport, parseBackup, type ImportMode } from "./backup";
import { saveBackupFile } from "./files";
import { dismissSharedBackup } from "./SharedBackupReceiver";
import { loadRecovery } from "../storage/workspace";

export function BackupSettings() {
  const { data, importBackup, restoreBackup, sharedBackup, setSharedBackup } = useApp();
  const { tr } = useI18n();
  const id = useId();
  const previewRef = useRef<HTMLDivElement>(null);
  const [incoming, setIncoming] = useState<Workspace | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [copyId, setCopyId] = useState(() => crypto.randomUUID());
  const [confirmed, setConfirmed] = useState(false);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<ReturnType<typeof loadRecovery>>(() => {
    try { return loadRecovery(); } catch { return null; }
  });
  function prepare(text: string) {
    const parsed = parseBackup(text);
    setIncoming(parsed); setMode("merge"); setTargets({}); setConfirmed(false); setCopyId(crypto.randomUUID());
  }
  useEffect(() => {
    if (!sharedBackup) return;
    setIncoming(null); setError(""); setMessage("");
    if (sharedBackup.error) { setError(tr(sharedBackup.error)); return; }
    try { prepare(sharedBackup.text ?? ""); }
    catch { setError(tr("Could not read this backup. Check its format, version and size (maximum 20 MB). Nothing was imported.")); }
  }, [sharedBackup, tr]);
  useEffect(() => {
    if (incoming) previewRef.current?.scrollIntoView?.({ block: "start" });
  }, [incoming]);
  if (!data) return null;
  let preview: ReturnType<typeof planImport> | null = null;
  let planError = "";
  if (incoming) {
    try { preview = planImport(data, incoming, { mode, targets, copyId }); }
    catch { planError = tr("Choose a different valid target for each child."); }
  }
  const dismiss = async () => {
    if (sharedBackup) { await dismissSharedBackup(sharedBackup.id); setSharedBackup(null); }
    setIncoming(null); setConfirmed(false);
  };
  return <section className="settings-section backup-settings" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{tr("Import and export")}</h2>
    <p>{tr("Back up all child profiles, record types, records, photos and supplies on this device.")}</p>
    <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true); setError(""); setMessage("");
      try { if (await saveBackupFile(exportBackup(data))) setMessage(tr("Backup exported")); }
      catch { setError(tr("Could not export. Please try again.")); }
      finally { setBusy(false); }
    }}>{tr("Export backup")}</Button>
    {sharedBackup && <p role="status">{tr("Shared backup")}: {sharedBackup.name}</p>}
    {!sharedBackup && <>
    <label htmlFor={`${id}-file`}>{tr("Import backup")}</label>
    <p id={`${id}-help`}>{tr("Choose a Little days JSON backup or a Cali Baby .calibabybackup file. Existing data is kept; matching record IDs are skipped.")}</p>
    <NativeInput id={`${id}-file`} type="file" disabled={busy || !!sharedBackup} aria-describedby={`${id}-help`} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      setIncoming(null); setError(""); setMessage(""); setBusy(true);
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error("Backup is too large (maximum 20 MB).");
        prepare(await file.text());
      } catch (cause) {
        const detail = cause instanceof Error && cause.message.startsWith("Unsupported Cali data:") ? cause.message : "";
        setError(detail ? `${tr("This backup contains unsupported data. Nothing was imported.")} ${detail}` : tr("Could not read this backup. Check its format, version and size (maximum 20 MB). Nothing was imported."));
      } finally { setBusy(false); }
    }} />
    </>}
    {incoming && <div className="backup-preview" ref={previewRef}>
      <h3>{tr("Import preview")}</h3>
      <fieldset className="backup-modes"><legend>{tr("How should this backup be imported?")}</legend>
        {([['merge', 'Merge records'], ['replace', 'Replace selected children’s records'], ['new', 'Create new child profiles']] as const).map(([value, label]) =>
          <label key={value}><NativeInput type="radio" name={`${id}-mode`} checked={mode === value} onChange={() => { setMode(value); setConfirmed(false); }} />{tr(label)}</label>)}
      </fieldset>
      {incoming.children.map(child => <div className="backup-target" key={child.id}>
        <label htmlFor={`${id}-${child.id}`}>{child.name} · {child.birthday}</label>
        {mode === "new" ? <p>{tr("A separate new profile will be created.")}</p> :
          <NativeSelect id={`${id}-${child.id}`} value={targets[child.id] ?? ""} onChange={e => { setTargets({ ...targets, [child.id]: e.target.value }); setConfirmed(false); }}>
            <option value="">{data.children.some(c => c.id === child.id) ? tr("Match the original profile") : tr("Create new child profile")}</option>
            {data.children.map(c => <option key={c.id} value={c.id}>{c.name} · {c.birthday}</option>)}
          </NativeSelect>}
      </div>)}
      {preview && <p>{tr("{children} new profiles, {records} new records, {skipped} existing records skipped.", { children: preview.children, records: preview.added, skipped: preview.skipped })}</p>}
      {mode === "replace" ? <>
        <p>{tr("This will remove all {count} existing records for the selected children, including records outside this backup’s date range. Other children are unchanged.", { count: preview?.replaced ?? 0 })}</p>
        <label className="backup-confirm"><NativeInput type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{tr("I confirm replacing these records.")}</label>
      </> : <p>{tr("Current profiles and records will not be overwritten. Active timers from backups are not resumed.")}</p>}
      <p>{tr("A recovery backup is saved on this device before import. You can also export a copy first.")}</p>
      {data.session && <p role="status">{tr("Finish the current timer before importing or restoring.")}</p>}
      {planError && <p role="alert">{planError}</p>}
      <div className="backup-actions">
        <Button disabled={busy || !!data.session || !preview || (mode === "replace" && !confirmed)} onClick={async () => {
          setBusy(true); setError("");
          if (importBackup(incoming, { mode, targets, copyId })) {
            setRecovery(loadRecovery()); setMessage(tr("Backup imported"));
            try { await dismiss(); }
            catch { setIncoming(null); setError(tr("Imported successfully, but the shared file could not be dismissed. Dismiss it before importing again.")); }
          } else setError(tr("Could not save the import. Existing data has not changed. Check available storage or reload and try again."));
          setBusy(false);
        }}>{tr("Confirm import")}</Button>
        <Button variant="outline" disabled={busy} onClick={async () => { try { await dismiss(); } catch { setError(tr("Could not dismiss the shared file. Please try again.")); } }}>{tr("Cancel")}</Button>
      </div>
    </div>}
    {sharedBackup && !incoming && <Button variant="outline" onClick={async () => { try { await dismiss(); } catch { setError(tr("Could not dismiss the shared file. Please try again.")); } }}>{tr("Dismiss shared backup")}</Button>}
    {recovery && <div className="backup-recovery">
      <h3>{tr("Recovery backup")}</h3>
      <p>{new Date(recovery.savedAt).toLocaleString()}</p>
      <Button variant="outline" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await saveBackupFile(exportBackup(recovery.workspace)); }
        catch { setError(tr("Could not export. Please try again.")); }
        finally { setBusy(false); }
      }}>{tr("Export recovery backup")}</Button>
      <label className="backup-confirm"><NativeInput type="checkbox" checked={restoreConfirmed} onChange={e => setRestoreConfirmed(e.target.checked)} />{tr("Restore all data to this snapshot. Current data will become the new recovery backup.")}</label>
      <Button variant="outline" disabled={busy || !restoreConfirmed || !!data.session} onClick={() => {
        if (restoreBackup()) { setRecovery(loadRecovery()); setRestoreConfirmed(false); setMessage(tr("Backup restored")); }
        else setError(tr("Could not restore the backup. Existing data has not changed."));
      }}>{tr("Restore recovery backup")}</Button>
    </div>}
    {busy && <p role="status">{tr("Working…")}</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
