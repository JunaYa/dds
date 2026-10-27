import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OverlayProvider } from "@vita/ui/overlay";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { WorkspaceProvider } from "../state/WorkspaceProvider";
import { emptyWorkspace } from "../domain/model";
import { STORAGE_KEY, loadWorkspace } from "../storage/workspace";
import { SiriRecordReceiver } from "./SiriRecordReceiver";
const native = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: native.invoke, isTauri: () => true }));
vi.mock("../components/layout/ios-platform", () => ({ isIosApp: () => true }));
const item = { id: "d50f468e-05ba-43cf-aaf8-1bb674b563fc", kind: "feed", amount: 120, time: "2026-10-26T01:12:00Z" };
function setup(two = false) {
  const workspace = emptyWorkspace();
  workspace.children = [{ id: "baby", name: "Baby", birthday: "2026-01-01" }];
  if (two) workspace.children.push({ id: "other", name: "Other", birthday: "2025-01-01" });
  workspace.child = "baby";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  return workspace;
}
function mount() {
  return render(<OverlayProvider><LocaleProvider><WorkspaceProvider><SiriRecordReceiver /></WorkspaceProvider></LocaleProvider></OverlayProvider>);
}
beforeEach(() => {
  localStorage.clear(); native.invoke.mockReset();
  native.invoke.mockImplementation(async (command: string) => command.endsWith("nextSiriRequest") ? item : undefined);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
it("prefills but does not save until confirmed, then acknowledges", async () => {
  setup(); mount();
  expect(await screen.findByLabelText(/Amount/)).toHaveValue(120);
  expect(loadWorkspace().data.records).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith("plugin:native-navigation|dismissSiriRequest", { id: item.id }));
  expect(loadWorkspace().data.records[0]).toMatchObject({ child: "baby", values: { amount: 120 }, source: { format: "siri", data: { requestId: item.id } } });
});
it("requires an explicit child choice for multiple children and cancels without saving", async () => {
  setup(true); mount();
  await screen.findByRole("heading", { name: "Confirm Siri record" });
  expect(screen.queryByRole("button", { name: "Save record" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "other" } });
  expect(await screen.findByLabelText(/Amount/)).toHaveValue(120);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith("plugin:native-navigation|dismissSiriRequest", { id: item.id }));
  expect(loadWorkspace().data.records).toHaveLength(0);
});
it("acknowledges a previously saved request without opening another form", async () => {
  const workspace = setup();
  workspace.records.push({ id: "saved", child: "baby", type: "feed", values: { amount: 120 }, time: "2026-10-26T09:12", note: "", source: { format: "siri", data: { requestId: item.id } } });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); mount();
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith("plugin:native-navigation|dismissSiriRequest", { id: item.id }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(loadWorkspace().data.records).toHaveLength(1);
});
it("retains the draft when persistence fails", async () => {
  setup(); mount(); await screen.findByLabelText(/Amount/);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(screen.getByLabelText(/Amount/)).toHaveValue(120);
  expect(native.invoke).not.toHaveBeenCalledWith("plugin:native-navigation|dismissSiriRequest", expect.anything());
  expect(loadWorkspace().data.records).toHaveLength(0);
  write.mockRestore();
});
it("keeps a saved request acknowledgement retry from saving twice", async () => {
  setup();
  native.invoke.mockImplementation(async (command: string) => {
    if (command.endsWith("dismissSiriRequest")) throw new Error("disk unavailable");
    return item;
  });
  mount(); await screen.findByLabelText(/Amount/);
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(await screen.findByText("Could not dismiss this request. Try again.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save record" })).not.toBeInTheDocument();
  expect(loadWorkspace().data.records).toHaveLength(1);
  native.invoke.mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(loadWorkspace().data.records).toHaveLength(1);
});
it("restores an unconfirmed request on a fresh mount", async () => {
  setup();
  const first = mount(); await screen.findByLabelText(/Amount/); first.unmount();
  expect(native.invoke).not.toHaveBeenCalledWith("plugin:native-navigation|dismissSiriRequest", expect.anything());
  mount(); expect(await screen.findByLabelText(/Amount/)).toHaveValue(120);
  expect(loadWorkspace().data.records).toHaveLength(0);
});
