import { beforeEach, expect, it } from "vitest";
import { emptyWorkspace, elapsedSeconds, localDateTime } from "../domain/model";
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from "./workspace";

beforeEach(() => localStorage.clear());
it("starts with an empty family and no fictional records", () => {
  const { data } = loadWorkspace();
  expect(data.children).toEqual([]);
  expect(data.records).toEqual([]);
  expect(data.types.some((t) => t.id === "feed")).toBe(true);
});
it("round trips records and active timers", () => {
  const data = emptyWorkspace();
  data.children.push({ id: "child", name: "Baby", birthday: "2026-01-01" });
  data.child = "child";
  data.records.push({
    id: "record",
    child: "child",
    type: "feed",
    time: "2026-09-19T10:00",
    note: "",
    values: { amount: 120 },
  });
  data.session = {
    child: "child",
    type: "sleep",
    started: 1000,
    elapsed: 10,
    time: "2026-09-19T10:00",
  };
  saveWorkspace(data, null);
  expect(loadWorkspace().data).toEqual(data);
  expect(elapsedSeconds(data.session, 61000)).toBe(70);
});
it("preserves damaged data instead of replacing it", () => {
  localStorage.setItem(STORAGE_KEY, "{broken");
  expect(() => loadWorkspace()).toThrow();
  expect(localStorage.getItem(STORAGE_KEY)).toBe("{broken");
});
it("rejects stale writes and invalid references", () => {
  const first = emptyWorkspace();
  saveWorkspace(first, null);
  expect(() => saveWorkspace(emptyWorkspace(), null)).toThrow();
  first.records.push({
    id: "r",
    child: "missing",
    type: "feed",
    time: "2026-09-19T10:00",
    note: "",
    values: {},
  });
  expect(() =>
    saveWorkspace(first, localStorage.getItem(STORAGE_KEY)),
  ).toThrow();
});
it("keeps paused timers fixed and formats local wall time", () => {
  expect(elapsedSeconds({ started: null, elapsed: 12 }, 50000)).toBe(12);
  expect(localDateTime(new Date(2026, 8, 19, 7, 5))).toBe("2026-09-19T07:05");
});

import { loadRecovery, RECOVERY_KEY, saveImportWorkspace } from "./workspace";
it("keeps a recoverable snapshot before an import and rejects stale writes before replacing the snapshot", () => {
  const before = emptyWorkspace();
  const raw = saveWorkspace(before, null);
  const after = { ...before, children: [{ id: "baby", name: "Baby", birthday: "2026-01-01" }], child: "baby" };
  saveImportWorkspace(after, before, raw);
  expect(loadRecovery()?.workspace).toEqual(before);
  const snapshot = localStorage.getItem(RECOVERY_KEY);
  expect(() => saveImportWorkspace(before, after, raw)).toThrow("another window");
  expect(localStorage.getItem(RECOVERY_KEY)).toBe(snapshot);
  expect(loadWorkspace().data).toEqual(after);
});

it("stores sync metadata with edits and preserves the current account during restore", async () => {
  const { trackChanges, materialize } = await import("../sync/engine");
  const { saveSyncedWorkspace } = await import("./workspace");
  const data = emptyWorkspace();
  data.children = [{ id: "baby", name: "Baby", birthday: "2026-01-01" }]; data.child = "baby";
  data.syncOwner = "icloud:current";
  data.sync = trackChanges(null, data, "10000000-0000-4000-8000-000000000001");
  localStorage.clear();
  const raw = saveSyncedWorkspace(data, null);
  const changed = structuredClone(data); changed.children[0].name = "Updated"; changed.syncOwner = "icloud:previous";
  const next = JSON.parse(saveWorkspace(changed, raw));
  expect(next.syncOwner).toBe("icloud:current");
  expect(materialize(next, next.sync).children[0].name).toBe("Updated");
});
