import { childSchema, recordSchema, supplySchema, typeSchema, summary, workspaceSchema } from "../domain/model";
import type { Collection, Version } from "./schema";
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { Button } from "@vita/ui/button";
import { NativeInput } from "@vita/ui/input";
import { NativeSelect } from "@vita/ui/select";
import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { isIosApp } from "../components/layout/ios-platform";
import { useCloudSync } from "./SyncContext";
import { beginAuthorization, pollAuthorization, disconnectProvider, cloudStatus, type Provider } from "./transport";
import { conflictKey, conflicts, versionKey, materialize } from "./engine";
import { saveBackupFile } from "../backup/files";
import { exportBackup } from "../backup/backup";

import { availableProviders, providerDefinition } from "./providers";

export function CloudSettings() {
  const { data, session } = useApp();
  const { tr } = useI18n();
  const sync = useCloudSync();
  const [provider, setProvider] = useState<Provider>(sync.binding?.provider ?? (isIosApp() ? "icloud" : "alipan"));
  const definition = providerDefinition(provider);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [qr, setQr] = useState<{ url: string; expiresAt: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [choices, setChoices] = useState<Record<string, string>>({});
  useEffect(() => {
    let disposed = false;
    setReady(false); setConfigured(true); setError(""); setConfirmed(false);
    if (isTauri()) void cloudStatus(provider).then(status => {
      if (!disposed) { setReady(status.connected); setConfigured(status.configured); }
    }).catch(cause => { if (!disposed) setError(String(cause)); });
    return () => { disposed = true; };
  }, [provider]);
  useEffect(() => {
    if (!qr) return;
    let disposed = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (Date.now() >= qr.expiresAt * 1000) throw Error("Authorization code expired");
        const connected = await pollAuthorization(provider);
        if (disposed) return;
        if (connected) { setQr(null); setReady(true); }
        else timer = setTimeout(poll, 3000);
      } catch (cause) { if (!disposed) { setError(String(cause)); setQr(null); } }
    };
    timer = setTimeout(poll, 3000);
    return () => { disposed = true; clearTimeout(timer); };
  }, [qr, provider]);
  const pending = data?.sync ? conflicts(data.sync) : [];
  let needsReview = pending.length > 0;
  if (data?.sync && !needsReview) {
    try { materialize(data, data.sync); } catch { needsReview = true; }
  }
  if (!isTauri()) return <p>{tr("Cloud sync is available in the installed app.")}</p>;
  return <div className="settings-page cloud-settings">
    <section className="settings-section">
      <h2>{tr("Cloud sync")}</h2>
      <p>{tr("Sync child profiles, records, photos, record types and supplies. Timers and device preferences stay on this device.")}</p>
      <label className="form-field">{tr("Cloud service")}
        <NativeSelect value={provider} disabled={!!sync.binding || authorizing || !!qr} onChange={event => setProvider(event.target.value as Provider)}>
          {availableProviders(isIosApp()).map(id => <option key={id} value={id}>{tr(providerDefinition(id).label)}</option>)}
        </NativeSelect>
      </label>
      <p>{tr("Devices using the same cloud account sync together. iCloud and Alipan do not sync with each other.")}</p>
      {!configured && <p role="status">{tr(definition.setupMessage)}</p>}
      {definition.authorizationNote && <p>{tr(definition.authorizationNote)}</p>}
      {!sync.binding && definition.authorization === "qr" && configured && !qr && <Button disabled={authorizing} onClick={async () => {
        setAuthorizing(true); setError("");
        try { setQr(await beginAuthorization(provider)); }
        catch (cause) { setError(String(cause)); }
        finally { setAuthorizing(false); }
      }}>{tr(ready ? definition.reconnectLabel : definition.connectLabel)}</Button>}
      {qr && <div className="cloud-authorization">
        <p>{tr(definition.qrInstruction ?? "")}</p>
        <img src={qr.url} alt={tr(definition.qrLabel ?? definition.label)} width={220} height={220} referrerPolicy="no-referrer" />
        <Button variant="outline" onClick={() => setQr(null)}>{tr("Cancel")}</Button>
      </div>}
      {!sync.binding && <>
        <label className="backup-confirm"><NativeInput type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{tr("Upload this device’s records to this account and merge changes from my other devices.")}</label>
        <Button disabled={!ready || !confirmed || !!session || sync.busy} onClick={() => void sync.enable(provider)}>{tr("Enable automatic sync")}</Button>
        {definition.authorization === "system" && !ready && <Button variant="outline" onClick={async () => {
          try { const status = await cloudStatus(provider); setReady(status.connected); setError(""); } catch (cause) { setError(String(cause)); }
        }}>{tr(definition.connectLabel)}</Button>}
      </>}
      {sync.binding && <>
        <p role="status">{tr(sync.busy ? "Syncing…" : "Automatic sync enabled")}</p>
        {sync.lastSync && <p>{tr("Last sync")}: {new Date(sync.lastSync).toLocaleString()}</p>}
        <div className="backup-actions">
          <Button disabled={sync.busy || !!session} onClick={() => void sync.sync()}>{tr("Sync now")}</Button>
          <Button variant="outline" onClick={sync.disable}>{tr("Pause sync")}</Button>
        </div>
      </>}
      {session && <p>{tr("Finish the current timer before syncing.")}</p>}
      <p>{tr("Changes sync while the app is open and when it returns to the foreground. Offline changes are kept and retried automatically.")}</p>
      <p>{tr("Cloud sync is not a backup. Deletions sync too; export a backup before major changes.")}</p>
      {data && <Button variant="outline" onClick={async () => { try { await saveBackupFile(exportBackup(data)); } catch { setError(tr("Could not export. Please try again.")); } }}>{tr("Export backup")}</Button>}
      <Button variant="outline" onClick={async () => {
        try {
          const previous = localStorage.getItem("little-days.before-sync.v1");
          if (!previous) { setError(tr("No pre-sync recovery copy is available yet.")); return; }
          await saveBackupFile(exportBackup(workspaceSchema.parse(JSON.parse(previous))));
        } catch { setError(tr("Could not export. Please try again.")); }
      }}>{tr("Export pre-sync recovery copy")}</Button>
      {!sync.binding && definition.authorization === "qr" && ready && <Button variant="outline" onClick={async () => {
        try { await disconnectProvider(provider); setReady(false); } catch (cause) { setError(String(cause)); }
      }}>{tr(definition.disconnectLabel)}</Button>}
    </section>
    {pending.length > 0 && <section className="settings-section">
      <h2>{tr("Review conflicting changes")}</h2>
      <p>{tr("Both versions are retained. Select the version to keep for each item.")}</p>
      {pending.map(entry => <fieldset className="sync-conflict" key={conflictKey(entry)}>
        <legend>{tr(({ children: "Child", types: "Record types", records: "Records", supplies: "Supplies" })[entry.collection])}</legend>
        {entry.versions.map((version, index) => <label key={`${version.device}:${version.sequence}`}>
          <NativeInput type="radio" name={conflictKey(entry)} checked={choices[conflictKey(entry)] === versionKey(version)} onChange={() => setChoices({ ...choices, [conflictKey(entry)]: versionKey(version) })} />
          <span>{tr("Version")} {index + 1}<VersionPreview collection={entry.collection} value={version.value} /></span>
        </label>)}
      </fieldset>)}
      <Button disabled={sync.busy || !!session || pending.some(entry => !entry.versions.some(version => versionKey(version) === choices[conflictKey(entry)]))} onClick={() => void sync.resolve(choices)}>{tr("Apply selected versions")}</Button>
    </section>}
    {needsReview && <section className="settings-section">
      <label className="backup-confirm"><NativeInput type="checkbox" checked={replaceConfirmed} onChange={event => setReplaceConfirmed(event.target.checked)} />{tr("Replace all received cloud changes with this device’s current data.")}</label>
      <Button variant="outline" disabled={!replaceConfirmed || sync.busy || !!session} onClick={() => void sync.resolve({}, true)}>{tr("Keep this device’s data")}</Button>
    </section>}
    {(error || sync.error) && <p role="alert">{tr(error || sync.error)}</p>}
  </div>;
}

function VersionPreview({ collection, value }: { collection: Collection; value: Version["value"] }) {
  const { data } = useApp();
  const { tr } = useI18n();
  if (value === null) return <p>{tr("Deleted")}</p>;
  if (collection === "children") {
    const child = childSchema.parse(value);
    return <p>{child.name} · {child.birthday}</p>;
  }
  if (collection === "types") {
    const type = typeSchema.parse(value);
    return <p>{type.name}<br />{type.fields.map(field => field.label).join(" · ")}</p>;
  }
  if (collection === "supplies") {
    const supply = supplySchema.parse(value);
    return <p>{supply.name} · {supply.stock} {supply.unit}</p>;
  }
  const record = recordSchema.parse(value);
  const type = data?.types.find(type => type.id === record.type);
  const child = data?.children.find(child => child.id === record.child);
  return <p>{child?.name} · {record.time.replace("T", " ")}<br />
    {type ? summary(record, type, tr) : tr("Records")}<br />{record.note}
    {!!record.photos?.length && <span> · {tr("Photos")}: {record.photos.length}</span>}
  </p>;
}
