import { childSchema, recordSchema, supplySchema, typeSchema, workspaceSchema, type Workspace } from "../domain/model";
import { syncStateSchema, type Collection, type SyncState, type Version } from "./schema";

export const collections: Collection[] = ["children", "types", "records", "supplies"];
const schemas = { children: childSchema, types: typeSchema, records: recordSchema, supplies: supplySchema };
const key = (entry: { collection: Collection; id: string }) => JSON.stringify([entry.collection, entry.id]);
export const versionKey = (v: Version) => `${v.device}:${v.sequence}`;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function validateState(input: unknown): SyncState {
  const state = syncStateSchema.parse(input);
  const keys = new Set<string>();
  for (const entry of state.entries) {
    if (keys.has(key(entry))) throw Error("Duplicate sync entry");
    keys.add(key(entry));
    const dots = new Set<string>();
    for (const version of entry.versions) {
      if ((state.clock[version.device] ?? 0) < version.sequence || dots.has(versionKey(version))) throw Error("Invalid sync clock");
      dots.add(versionKey(version));
      if (version.value !== null && schemas[entry.collection].parse(version.value).id !== entry.id) throw Error("Invalid sync identity");
    }
  }
  state.entries.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  for (const entry of state.entries) entry.versions.sort((a, b) => versionKey(a) < versionKey(b) ? -1 : versionKey(a) > versionKey(b) ? 1 : 0);
  return state;
}
export function emptyState(): SyncState { return { version: 1, clock: {}, entries: [] }; }
function write(state: SyncState, device: string, changes: { collection: Collection; id: string; value: Version["value"] }[]) {
  if (!changes.length) return state;
  const next = structuredClone(state);
  const sequence = (next.clock[device] ?? 0) + 1;
  next.clock[device] = sequence;
  for (const change of changes) {
    const entry = { collection: change.collection, id: change.id, versions: [{ device, sequence, value: change.value }] };
    const index = next.entries.findIndex(existing => key(existing) === key(entry));
    if (index < 0) next.entries.push(entry); else next.entries[index] = entry;
  }
  return validateState(next);
}
export function trackChanges(before: Workspace | null, after: Workspace, device: string, base = before?.sync ?? emptyState()) {
  const changes: { collection: Collection; id: string; value: Version["value"] }[] = [];
  for (const collection of collections) {
    const oldItems = new Map((before?.[collection] ?? []).map(item => [item.id, item]));
    const items = new Map(after[collection].map(item => [item.id, item]));
    for (const id of new Set([...oldItems.keys(), ...items.keys()])) {
      const value = items.get(id) ?? null;
      if (canonical(oldItems.get(id) ?? null) !== canonical(value)) changes.push({ collection, id, value });
    }
  }
  return write(validateState(base), device, changes);
}
// A value missing from a replica that has seen its dot was superseded there.
export function mergeStates(a: SyncState, b: SyncState): SyncState {
  a = validateState(a); b = validateState(b);
  const entries: SyncState["entries"] = [];
  const left = new Map(a.entries.map(e => [key(e), e]));
  const right = new Map(b.entries.map(e => [key(e), e]));
  for (const id of new Set([...left.keys(), ...right.keys()])) {
    const l = left.get(id), r = right.get(id);
    const versions = new Map<string, Version>();
    for (const [source, other, clock] of [[l, r, b.clock], [r, l, a.clock]] as const) {
      for (const v of source?.versions ?? []) {
        const same = other?.versions.find(candidate => versionKey(candidate) === versionKey(v));
        if (same && canonical(same.value) !== canonical(v.value)) throw Error("Sync identity collision");
        if (same || (clock[v.device] ?? 0) < v.sequence) versions.set(versionKey(v), v);
      }
    }
    if (versions.size) entries.push({ collection: (l ?? r)!.collection, id: (l ?? r)!.id, versions: [...versions.values()].sort((x, y) => versionKey(x) < versionKey(y) ? -1 : versionKey(x) > versionKey(y) ? 1 : 0) });
  }
  const clock = { ...a.clock };
  for (const [device, n] of Object.entries(b.clock)) clock[device] = Math.max(clock[device] ?? 0, n);
  return validateState({ version: 1, clock, entries: entries.sort((x, y) => key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0) });
}
export function conflicts(state: SyncState) {
  return state.entries.filter(e => new Set(e.versions.map(v => canonical(v.value))).size > 1);
}
export function materialize(local: Workspace, state: SyncState): Workspace {
  if (conflicts(state).length) throw Error("Sync conflicts need a decision");
  const data = { ...local, sync: state };
  for (const collection of collections) {
    const values = state.entries.filter(e => e.collection === collection).map(e => e.versions[0].value).filter(v => v !== null);
    Object.assign(data, { [collection]: values });
  }
  if (!data.children.some(c => c.id === data.child)) data.child = data.children[0]?.id ?? "";
  // Timers are device-local; applying a remote deletion must never discard a running timer.
  return workspaceSchema.parse(data);
}
export function resolveVersions(state: SyncState, choices: Record<string, string>, device: string) {
  return write(state, device, conflicts(state).map(entry => {
    const selected = entry.versions.find(version => versionKey(version) === choices[key(entry)]);
    if (!selected) throw Error("Choose a version for every conflict");
    return { collection: entry.collection, id: entry.id, value: selected.value };
  }));
}
export function preferLocal(local: Workspace, state: SyncState, device: string) {
  return write(state, device, state.entries.map(entry => ({ collection: entry.collection, id: entry.id, value: local[entry.collection].find(item => item.id === entry.id) ?? null })));
}
export const conflictKey = key;
