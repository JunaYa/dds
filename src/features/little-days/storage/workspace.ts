import { emptyWorkspace, workspaceSchema, type Workspace } from "../domain/model";

export const STORAGE_KEY = "little-days.workspace.v1";
export function loadWorkspace() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return {
    raw,
    data:
      raw === null ? emptyWorkspace() : workspaceSchema.parse(JSON.parse(raw)),
  };
}
export function saveWorkspace(data: Workspace, expected: string | null) {
  const validated = workspaceSchema.parse(data);
  if (localStorage.getItem(STORAGE_KEY) !== expected)
    throw new Error(
      "Records changed in another window. Reload before saving again.",
    );
  const raw = JSON.stringify(validated);
  localStorage.setItem(STORAGE_KEY, raw);
  return raw;
}

export const RECOVERY_KEY = "little-days.before-import.v1";
export function saveImportWorkspace(data: Workspace, before: Workspace, expected: string | null) {
  workspaceSchema.parse(data);
  if (localStorage.getItem(STORAGE_KEY) !== expected) throw new Error("Records changed in another window. Reload before saving again.");
  localStorage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), workspace: workspaceSchema.parse(before) }));
  return saveWorkspace(data, expected);
}
export function loadRecovery(): { savedAt: string; workspace: Workspace } | null {
  const raw = localStorage.getItem(RECOVERY_KEY);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (typeof value.savedAt !== "string" || Number.isNaN(Date.parse(value.savedAt))) throw new Error("Invalid recovery backup");
  return { savedAt: value.savedAt, workspace: workspaceSchema.parse(value.workspace) };
}
