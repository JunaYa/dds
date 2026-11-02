import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { emptyWorkspace } from "../domain/model";
import { saveWorkspace } from "../storage/workspace";
import { useWorkspaceState } from "./useWorkspaceState";

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it("filters the selected child's local day without resetting historical queries on focus or midnight", () => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 30, 12));
  const data = emptyWorkspace();
  data.children = [
    { id: "a", name: "A", birthday: "2026-01-01" },
    { id: "b", name: "B", birthday: "2026-01-01" },
  ];
  data.child = "a";
  data.records = [
    { id: "past", child: "a", type: data.types[0].id, time: "2026-10-29T23:59", note: "milk", values: {} },
    { id: "current", child: "a", type: data.types[0].id, time: "2026-10-30T00:00", note: "", values: {} },
    { id: "other", child: "b", type: data.types[0].id, time: "2026-10-29T12:00", note: "", values: {} },
  ];
  saveWorkspace(data, null);
  const { result } = renderHook(useWorkspaceState, { wrapper: LocaleProvider });
  act(() => {
    result.current.setRecordDay("2026-10-29");
    result.current.setRange("today");
  });
  expect(result.current.visible.map(record => record.id)).toEqual(["past"]);
  expect(result.current.day).toBe("2026-10-30");
  act(() => {
    vi.setSystemTime(new Date(2026, 9, 31, 12));
    window.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(30000);
  });
  expect(result.current.day).toBe("2026-10-31");
  expect(result.current.recordDay).toBe("2026-10-29");
  expect(result.current.visible.map(record => record.id)).toEqual(["past"]);
  act(() => result.current.setQuery("absent"));
  expect(result.current.visible).toHaveLength(0);
  act(() => {
    result.current.setQuery("");
    result.current.setRange("all");
  });
  expect(result.current.visible.map(record => record.id)).toEqual(["current", "past"]);
  act(() => result.current.setRecordDay(null));
  expect(result.current.recordDay).toBe("2026-10-31");
});
