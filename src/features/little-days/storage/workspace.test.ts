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
