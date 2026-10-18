import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SyncProvider } from "./SyncProvider";
import { useCloudSync } from "./SyncContext";
import { emptyWorkspace, type Workspace } from "../domain/model";
import { trackChanges } from "./engine";
const cloud = vi.hoisted(() => ({ pull: vi.fn(), push: vi.fn(), status: vi.fn(), app: {} as Record<string, unknown> }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }));
vi.mock("./transport", () => ({ pull: cloud.pull, push: cloud.push, cloudStatus: cloud.status }));
vi.mock("../hooks/useApp", () => ({ useApp: () => cloud.app }));
const actor = "10000000-0000-4000-8000-000000000001";
let data: Workspace, raw: string;
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  localStorage.setItem("little-days.cloud-binding", JSON.stringify({provider:"icloud",account:"test"}));
  data = { ...emptyWorkspace(), children: [{id:"baby",name:"Baby",birthday:"2026-01-01"}],child:"baby",syncOwner:"icloud:test" };
  data.sync = trackChanges(null,data,actor); raw = JSON.stringify(data);
  cloud.app = { modal:null,nursingOpen:false,session:null,
    syncSnapshot: () => ({data,raw}),
    acceptSync: vi.fn((next: Workspace, expected: string) => { expect(expected).toBe(raw); data=next;raw=JSON.stringify(next); }),
  };
  cloud.pull.mockResolvedValue([]); cloud.push.mockResolvedValue(undefined);
});
afterEach(cleanup);
const render = () => renderHook(useCloudSync, { wrapper: SyncProvider });
it("uploads only after reading cloud data and skips unchanged revisions", async () => {
  cloud.pull.mockResolvedValue([data.sync]);
  const view = render();
  await waitFor(() => expect(view.result.current.lastSync).not.toBe(""));
  expect(cloud.push).not.toHaveBeenCalled();
});
it("merges edits saved while the network request is in flight", async () => {
  let finish!: (value: unknown[]) => void;
  cloud.pull.mockImplementation(() => new Promise(resolve => { finish=resolve; }));
  const view = render();
  await waitFor(() => expect(cloud.pull).toHaveBeenCalled());
  const next = structuredClone(data); next.children[0].name="New name";
  next.sync=trackChanges(data,next,actor);data=next;raw=JSON.stringify(next);
  await act(async () => finish([]));
  await waitFor(() => expect(view.result.current.busy).toBe(false));
  expect(cloud.push.mock.calls[0][2].entries.find((e: {collection:string})=>e.collection==="children").versions[0].value.name).toBe("New name");
});
it("pausing during download prevents applying and uploading that result", async () => {
  let finish!: (value: unknown[]) => void;
  cloud.pull.mockImplementation(() => new Promise(resolve => { finish=resolve; }));
  const view=render();
  await waitFor(() => expect(cloud.pull).toHaveBeenCalled());
  act(() => view.result.current.disable());
  await act(async () => finish([]));
  expect(cloud.push).not.toHaveBeenCalled(); expect(cloud.app.acceptSync).not.toHaveBeenCalled();
});
it("keeps local records intact when a cloud request fails", async () => {
  const original=raw;cloud.pull.mockRejectedValue(Error("offline"));
  const view=render();
  await waitFor(()=>expect(view.result.current.error).toBe("offline"));
  expect(raw).toBe(original);expect(cloud.push).not.toHaveBeenCalled();
});
it("defers synchronization during a record edit", () => {
  cloud.app.modal={kind:"record"};render();expect(cloud.pull).not.toHaveBeenCalled();
});
it("does not send local data when the cloud binding belongs to another account", async () => {
  data.syncOwner="icloud:other";
  const view=render();
  await waitFor(()=>expect(view.result.current.error).toMatch(/Reconnect/));
  expect(cloud.push).not.toHaveBeenCalled();
});
