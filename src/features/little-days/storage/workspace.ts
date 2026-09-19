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
