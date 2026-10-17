import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSystemTabs } from "./use-system-tabs";

const native = vi.hoisted(() => ({ invoke: vi.fn(), channel: null as null | { onmessage: (message: { page?: string; action?: string }) => void } }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: native.invoke,
  Channel: class {
    onmessage = (_message: { page?: string; action?: string }) => {};
    constructor() { native.channel = this; }
  },
}));
beforeEach(() => {
  window.__DDS_NATIVE_NAVIGATION__ = true;
  native.invoke.mockReset().mockResolvedValue({ supported: true });
});
afterEach(() => { delete window.__DDS_NATIVE_NAVIGATION__; });

it("synchronizes native selection, labels, modal visibility and cleanup", async () => {
  const navigate = vi.fn();
  const { result, rerender, unmount } = renderHook(({ blocked, titles, theme }) =>
    useSystemTabs("Today", titles, blocked, navigate, theme), {
    initialProps: { blocked: false, titles: ["Home records", "Analysis", "My"], theme: "light" as "light" | "dark" },
  });
  await waitFor(() => expect(result.current).toBe(true));
  act(() => native.channel!.onmessage({ page: "Analysis" }));
  expect(navigate).toHaveBeenCalledWith("Analysis");
  act(() => native.channel!.onmessage({ page: "invalid" }));
  expect(navigate).toHaveBeenCalledTimes(1);
  rerender({ blocked: true, titles: ["随记", "分析", "我的"], theme: "dark" });
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith(
    "plugin:native-navigation|updateTabs", expect.objectContaining({ visible: false, titles: ["随记", "分析", "我的"], theme: "dark" })));
  act(() => native.channel!.onmessage({ page: "My" }));
  expect(navigate).toHaveBeenCalledTimes(1);
  unmount();
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith("plugin:native-navigation|detach", expect.anything()));
});

it("retains web navigation on unsupported systems", async () => {
  native.invoke.mockResolvedValue({ supported: false });
  const { result } = renderHook(() => useSystemTabs("Today", ["Home", "Analysis", "My"], false, vi.fn()));
  await act(async () => {});
  expect(result.current).toBe(false);
  expect(native.invoke).not.toHaveBeenCalledWith("plugin:native-navigation|updateTabs", expect.anything());
});

it("detaches when unmounted during attachment", async () => {
  let finish!: (value: { supported: boolean }) => void;
  native.invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = renderHook(() => useSystemTabs("Today", ["Home", "Analysis", "My"], false, vi.fn()));
  unmount();
  await act(async () => { finish({ supported: true }); });
  expect(native.invoke).toHaveBeenCalledWith("plugin:native-navigation|detach", expect.anything());
});

it("restores web navigation and detaches if native synchronization fails", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  native.invoke.mockImplementation((name: string) => name.endsWith("updateTabs")
    ? Promise.reject(new Error("Bridge unavailable")) : Promise.resolve({ supported: true }));
  const { result } = renderHook(() => useSystemTabs("Today", ["Home", "Analysis", "My"], false, vi.fn()));
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith("plugin:native-navigation|detach", expect.anything()));
  expect(result.current).toBe(false);
  warning.mockRestore();
});


it("routes the native add action without switching tabs and ignores it while blocked", async () => {
  const navigate = vi.fn();
  const add = vi.fn();
  const { rerender, unmount } = renderHook(({ blocked }) =>
    useSystemTabs("My", ["Home", "Analysis", "My"], blocked, navigate, "dark", {
      title: "添加记录", onAdd: add,
    }), { initialProps: { blocked: false } });
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith(
    "plugin:native-navigation|updateTabs", expect.objectContaining({ addTitle: "添加记录" })));
  act(() => native.channel!.onmessage({ action: "add-record" }));
  expect(add).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
  rerender({ blocked: true });
  act(() => native.channel!.onmessage({ action: "add-record" }));
  expect(add).toHaveBeenCalledTimes(1);
  unmount();
  act(() => native.channel!.onmessage({ action: "add-record" }));
  expect(add).toHaveBeenCalledTimes(1);
});
