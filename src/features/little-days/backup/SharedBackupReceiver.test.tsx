import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SharedBackupReceiver } from "./SharedBackupReceiver";
const mock = vi.hoisted(() => ({ invoke: vi.fn(), listen: vi.fn(), unlisten: vi.fn(), setSharedBackup: vi.fn(), setPage: vi.fn(), modal: null as object | null, receive: () => {} }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mock.invoke, isTauri: () => true }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mock.listen }));
vi.mock("../components/layout/ios-platform", () => ({ isIosApp: () => true }));
vi.mock("../hooks/useApp", () => ({ useApp: () => ({ sharedBackup: null, setSharedBackup: mock.setSharedBackup, setPage: mock.setPage, child: "baby", modal: mock.modal, nursingOpen: false }) }));
beforeEach(() => {
  vi.clearAllMocks(); mock.modal = null;
  mock.invoke.mockResolvedValue(null);
  mock.listen.mockImplementation(async (_name, callback) => { mock.receive = callback; return mock.unlisten; });
});
afterEach(cleanup);
it("delivers a retained backup on startup and navigates to Profile", async () => {
  const item = { id: "file", name: "backup", text: "{}" };
  mock.invoke.mockResolvedValue(item);
  render(<SharedBackupReceiver />);
  await waitFor(() => expect(mock.setSharedBackup).toHaveBeenCalledWith(item));
  expect(mock.setPage).toHaveBeenCalledWith("My");
});
it("defers receipt until a record dialog is closed", async () => {
  mock.modal = {};
  const view = render(<SharedBackupReceiver />);
  expect(mock.invoke).not.toHaveBeenCalled();
  mock.modal = null;
  view.rerender(<SharedBackupReceiver />);
  await waitFor(() => expect(mock.invoke).toHaveBeenCalled());
});
it("rechecks when a share arrives during an in-flight inbox read", async () => {
  let finish!: (value: null) => void;
  const item = { id: "file", name: "backup", text: "{}" };
  mock.invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(item);
  render(<SharedBackupReceiver />);
  await waitFor(() => expect(mock.invoke).toHaveBeenCalledTimes(1));
  await act(async () => { mock.receive(); finish(null); });
  await waitFor(() => expect(mock.setSharedBackup).toHaveBeenCalledWith(item));
});
it("does not navigate after disposal", async () => {
  let finish!: (value: unknown) => void;
  mock.invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<SharedBackupReceiver />);
  await waitFor(() => expect(mock.invoke).toHaveBeenCalled());
  view.unmount();
  await act(async () => finish({ id: "file" }));
  expect(mock.setPage).not.toHaveBeenCalled();
});
