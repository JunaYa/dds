import { beforeEach, describe, expect, it, vi } from "vitest";
import { newTask } from "./model";
import { loadTasks, persistTasks, storageKey } from "./storage";

describe("collage local storage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });
  it("starts empty and round trips task configuration and running timestamps", () => {
    expect(loadTasks()).toEqual({ tasks: [], error: null });
    const task = {
      ...newTask(),
      title: "读书",
      blocks: ["timer" as const],
      started: 1000,
    };
    expect(persistTasks([task])).toBeNull();
    expect(loadTasks()).toEqual({ tasks: [task], error: null });
  });
  it.each([
    "{",
    "[null]",
    "[{}]",
    JSON.stringify([{ ...newTask(), title: "读书", timer: -1 }]),
  ])("preserves invalid data without silently overwriting it", (raw) => {
    localStorage.setItem(storageKey, raw);
    expect(loadTasks().error).toBeTruthy();
    expect(localStorage.getItem(storageKey)).toBe(raw);
  });
  it("reports quota failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(persistTasks([])).toContain("未能保存");
  });
});
