import { z } from "zod";
import { workspaceSchema, type Workspace } from "../domain/model";
import { parseCali } from "./cali";

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const backupSchema = z.object({ format: z.literal("little-days-backup"), version: z.literal(1), exportedAt: z.iso.datetime(), workspace: workspaceSchema });
export function exportBackup(workspace: Workspace) {
  return JSON.stringify(backupSchema.parse({ format: "little-days-backup", version: 1, exportedAt: new Date().toISOString(), workspace }), null, 2);
}
export function parseBackup(text: string): Workspace {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error("Backup is too large (maximum 20 MB).");
  const value: unknown = JSON.parse(text);
  if (typeof value === "object" && value && "manifest" in value) return parseCali(value);
  return backupSchema.parse(value).workspace;
}

// Existing identifiers win, including records edited locally after a previous import.
export function mergeBackup(current: Workspace, incoming: Workspace) {
  incoming = workspaceSchema.parse(incoming);
  const types = [...current.types];
  const typeIds = new Map<string, string>();
  for (const type of incoming.types) {
    let id = type.id;
    let suffix = 1;
    while (types.some(t => t.id === id && JSON.stringify({ ...t, id: type.id }) !== JSON.stringify(type))) id = `${type.id}-import-${suffix++}`;
    if (!types.some(t => t.id === id)) types.push({ ...type, id });
    typeIds.set(type.id, id);
  }
  const children = incoming.children.filter(c => !current.children.some(existing => existing.id === c.id));
  const records = incoming.records.filter(r => !current.records.some(existing => existing.id === r.id)).map(r => ({ ...r, type: typeIds.get(r.type)! }));
  const supplies = incoming.supplies.filter(s => !current.supplies.some(existing => existing.id === s.id));
  const workspace = workspaceSchema.parse({ ...current, children: [...current.children, ...children], child: current.child || incoming.child, types, records: [...current.records, ...records], supplies: [...current.supplies, ...supplies] });
  return { workspace, added: records.length, skipped: incoming.records.length - records.length, children: children.length };
}

export type ImportMode = "merge" | "replace" | "new";
export type ImportOptions = { mode: ImportMode; targets: Record<string, string>; copyId: string };
export function planImport(current: Workspace, incoming: Workspace, options: ImportOptions) {
  const mapped = structuredClone(workspaceSchema.parse(incoming));
  const targetIds = new Map<string, string>();
  const occupied = new Set<string>();
  mapped.children = mapped.children.map(child => {
    const target = options.mode === "new" ? "" : options.targets[child.id];
    if (target && !current.children.some(c => c.id === target)) throw new Error("Import target no longer exists.");
    const id = target || (options.mode === "new" ? `copy:${options.copyId}:${child.id}` : child.id);
    if (occupied.has(id)) throw new Error("Choose a different target for each child.");
    occupied.add(id); targetIds.set(child.id, id);
    return { ...child, id };
  });
  mapped.child = targetIds.get(mapped.child) ?? "";
  mapped.session = null;
  mapped.records = mapped.records.map(record => {
    const child = targetIds.get(record.child)!;
    return { ...record, child, id: child === record.child ? record.id : `mapped:${child}:${record.id}` };
  });
  const replaced = options.mode === "replace" ? current.records.filter(r => occupied.has(r.child)).length : 0;
  const base = options.mode === "replace" ? { ...current, records: current.records.filter(r => !occupied.has(r.child)) } : current;
  const result = mergeBackup(base, mapped);
  result.workspace.child = mapped.child || current.child;
  return { ...result, replaced };
}
