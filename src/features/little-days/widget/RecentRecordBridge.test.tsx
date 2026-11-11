import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OverlayProvider } from "@vita/ui/overlay";
import { WorkspaceModal } from "../components/dialogs/WorkspaceModal";
import { emptyWorkspace } from "../domain/model";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { WorkspaceProvider } from "../state/WorkspaceProvider";
import { loadWorkspace, saveSyncedWorkspace, STORAGE_KEY } from "../storage/workspace";
import { RecentRecordBridge } from "./RecentRecordBridge";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }));
vi.mock("../components/layout/ios-platform", () => ({ isIosApp: () => true }));

beforeEach(() => {
  localStorage.clear();
  invoke.mockReset();
  const data = emptyWorkspace();
  data.children = ["a", "b"].map(id => ({ id, name: id, birthday: "2026-01-01" }));
  data.child = "a";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
function mount(child: string, type: string) {
  let pending: { id: string; child: string; type: string } | null = { id: "widget-test", child, type };
  invoke.mockImplementation(async (command: string) => {
    if (command === "plugin:native-navigation|nextWidgetRequest") return pending;
    if (command === "plugin:native-navigation|dismissWidgetRequest") pending = null;
  });
  render(<OverlayProvider><LocaleProvider><WorkspaceProvider>
    <RecentRecordBridge /><WorkspaceModal />
  </WorkspaceProvider></LocaleProvider></OverlayProvider>);
}
it("opens the requested baby's form and publishes its timestamp only after saving", async () => {
  mount("b", "diaper");
  expect(await screen.findByText("Recording for b.")).toBeInTheDocument();
  expect(loadWorkspace().data.records).toHaveLength(0);
  fireEvent.click(screen.getByRole("radio", { name: "Wet", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("plugin:native-navigation|updateWidgetSnapshot",
    expect.objectContaining({ latest: { b: { diaper: expect.any(Number) } } })));
  expect(loadWorkspace().data.records[0]).toMatchObject({ child: "b", type: "diaper" });
});
it("discards a stale widget selection without changing the active baby", async () => {
  mount("deleted", "feed");
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("plugin:native-navigation|dismissWidgetRequest", { id: "widget-test" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(loadWorkspace().data.child).toBe("a");
});

it("uses the latest timestamp per baby and type after a synced deletion", async () => {
  const { data } = loadWorkspace();
  const entries = ["12:00", "08:00"].map(time => ({
    child: "a", id: time, type: "feed", time: `2026-11-12T${time}`, values: {}, note: "",
  }));
  data.records = entries;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  mount("deleted", "feed");
  const expectTime = (time: string) => expect(invoke).toHaveBeenCalledWith(
    "plugin:native-navigation|updateWidgetSnapshot",
    expect.objectContaining({ latest: { a: { feed: new Date(time).getTime() / 1000 } } }),
  );
  await waitFor(() => expectTime(entries[0].time));
  act(() => { saveSyncedWorkspace({ ...data, records: entries.slice(1) }, loadWorkspace().raw); });
  await waitFor(() => expectTime(entries[1].time));
});
