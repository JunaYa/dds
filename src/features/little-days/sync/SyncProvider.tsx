import type { Workspace } from "../domain/model";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useApp } from "../hooks/useApp";
import { canonical, conflicts, materialize, mergeStates, preferLocal, resolveVersions, trackChanges } from "./engine";
import { deviceId } from "./device";
import { cloudStatus, pull, push, type Provider } from "./transport";
import { SyncContext, type Binding } from "./SyncContext";
import { z } from "zod";
import { providerSchema } from "./providers";
const KEY = "little-days.cloud-binding";
const bindingSchema = z.object({ provider: providerSchema, account: z.string().min(1) });
function loadBinding(): Binding | null {
  try { return bindingSchema.parse(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { return null; }
}
export function SyncProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const latest = useRef(app); latest.current = app;
  const [binding, setBinding] = useState<Binding | null>(loadBinding);
  const bindingRef = useRef(binding); bindingRef.current = binding;
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState("");
  const failures = useRef(0);
  const nextAttempt = useRef(0);
  const generation = useRef(0);
  const sync = useCallback(async () => {
    const target = bindingRef.current;
    const a = latest.current;
    if (!target || !isTauri() || working.current || a.modal || a.nursingOpen || a.session || document.visibilityState === "hidden" || !navigator.onLine) return;
    const revision = generation.current;
    working.current = true; setBusy(true); setError("");
    const owner = `${target.provider}:${target.account}`;
    try {
      const remote = await pull(target.provider, target.account);
      if (revision !== generation.current) return;
      const snapshot = latest.current.syncSnapshot();
      if (!snapshot.data?.sync || snapshot.data.syncOwner !== owner) throw Error("Reconnect this device before syncing.");
      let state = snapshot.data.sync;
      for (const changes of remote) state = mergeStates(state, changes);
      const changed = canonical(state) !== canonical(snapshot.data.sync);
      let next: Workspace = { ...snapshot.data, sync: state };
      let conflictError = "";
      try { next = materialize(next, state); }
      catch { conflictError = conflicts(state).length ? "Conflicting changes need your review." : "Related records changed on different devices. Review before applying."; }
      if (changed || canonical(next) !== canonical(snapshot.data)) latest.current.acceptSync(next, snapshot.raw);
      if (revision !== generation.current) return;
      // Upload the durable merged revision. New edits made during upload remain queued for the next pass.
      if (!remote.some(item => canonical(item) === canonical(state))) await push(target.provider, target.account, state);
      if (revision !== generation.current) return;
      failures.current = 0; nextAttempt.current = 0;
      setLastSync(new Date().toISOString()); setError(conflictError);
    } catch (cause) {
      if (revision !== generation.current) return;
      failures.current += 1;
      nextAttempt.current = Date.now() + Math.min(300000, 5000 * 2 ** Math.min(failures.current, 6));
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { working.current = false; setBusy(false); }
  }, []);
  useEffect(() => {
    if (!binding) return;
    const attempt = () => { if (Date.now() >= nextAttempt.current) void sync(); };
    const timer = window.setInterval(attempt, 30000);
    let debounce: ReturnType<typeof setTimeout>;
    const changed = () => { clearTimeout(debounce); debounce = setTimeout(attempt, 1500); };
    const storage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) { generation.current++; setBinding(loadBinding()); }
    };
    window.addEventListener("online", attempt); window.addEventListener("focus", attempt);
    window.addEventListener("little-days-workspace-changed", changed); window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", attempt);
    attempt();
    return () => { clearInterval(timer); clearTimeout(debounce); window.removeEventListener("online", attempt); window.removeEventListener("focus", attempt); window.removeEventListener("little-days-workspace-changed", changed); window.removeEventListener("storage", storage); document.removeEventListener("visibilitychange", attempt); };
  }, [binding, sync]);
  useEffect(() => () => { generation.current++; }, []);
  const enable = async (provider: Provider) => {
    setError("");
    try {
      if (working.current) throw Error("Wait for the current sync to finish.");
      const status = await cloudStatus(provider);
      if (!status.configured || !status.connected || !status.account) throw Error("Connect your cloud account first.");
      const target = { provider, account: status.account };
      const owner = `${provider}:${status.account}`;
      const snapshot = latest.current.syncSnapshot();
      if (!snapshot.data) throw Error("Local records could not be read.");
      if (!snapshot.data.sync || snapshot.data.syncOwner !== owner) {
        // A new actor prevents a previous cloud account's causal history from being reused.
        const actor = crypto.randomUUID();
        localStorage.setItem("little-days.sync-device", actor);
        latest.current.acceptSync({ ...snapshot.data, syncOwner: owner, sync: trackChanges(null, snapshot.data, actor) }, snapshot.raw);
      }
      localStorage.setItem(KEY, JSON.stringify(target)); generation.current++; nextAttempt.current = 0;
      bindingRef.current = target; setBinding(target); setLastSync("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const disable = () => {
    try { localStorage.removeItem(KEY); generation.current++; bindingRef.current = null; setBinding(null); setError(""); }
    catch { setError("Could not save the sync preference."); }
  };
  const resolve = async (choices: Record<string, string>, local = false) => {
    try {
      const snapshot = latest.current.syncSnapshot();
      if (!snapshot.data?.sync) return;
      const state = local ? preferLocal(snapshot.data, snapshot.data.sync, deviceId()) : resolveVersions(snapshot.data.sync, choices, deviceId());
      const next = materialize(snapshot.data, state);
      latest.current.acceptSync(next, snapshot.raw);
      nextAttempt.current = 0; await sync();
    } catch { setError("These versions cannot be combined. Keep this device’s data or review related records."); }
  };
  return <SyncContext.Provider value={{ binding, busy, error, lastSync, enable, disable, sync, resolve }}>{children}</SyncContext.Provider>;
}
