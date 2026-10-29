import { act, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useIosModalInteraction } from "./use-ios-modal-interaction";
import { Dialog, DialogPopup, DialogTitle } from "@vita/ui/dialog";
import { Sheet, SheetPopup, SheetTitle } from "@vita/ui/sheet";

const native = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue(undefined), ios: true }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: native.invoke }));
vi.mock("./ios-platform", () => ({ isIosApp: () => native.ios }));
function Host() { useIosModalInteraction(); return null; }
const nodes: HTMLElement[] = [];
function modal(role = "dialog") {
  const node = document.createElement("div");
  node.setAttribute("role", role);
  node.setAttribute("data-open", "");
  document.body.append(node);
  nodes.push(node);
  return node;
}
afterEach(() => { nodes.forEach(node => node.remove()); nodes.length = 0; native.ios = true; vi.clearAllMocks(); });

it("holds the native constraint across nested modals and exit animations", async () => {
  const { unmount } = render(<Host />);
  const first = modal();
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith(expect.any(String), { session: expect.any(String), active: true }));
  const session = native.invoke.mock.calls[0][1].session;
  const alert = modal("alertdialog");
  act(() => { first.removeAttribute("data-open"); first.setAttribute("data-ending-style", ""); });
  first.remove();
  await act(async () => {});
  expect(native.invoke).toHaveBeenCalledTimes(1);
  alert.removeAttribute("data-open");
  await waitFor(() => expect(native.invoke).toHaveBeenLastCalledWith(expect.any(String), { session, active: false }));
  unmount();
});

it("releases its own session on unmount even with a request still in flight", async () => {
  let finish: (() => void) | undefined;
  native.invoke.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  modal();
  const { unmount } = render(<Host />);
  await waitFor(() => expect(finish).toBeDefined());
  const session = native.invoke.mock.calls[0][1].session;
  unmount();
  await act(async () => finish?.());
  await waitFor(() => expect(native.invoke).toHaveBeenLastCalledWith(expect.any(String), { session, active: false }));
});

it("does not invoke the iOS bridge on other platforms", async () => {
  native.ios = false;
  modal();
  const { unmount } = render(<Host />);
  unmount();
  await act(async () => {});
  expect(native.invoke).not.toHaveBeenCalled();
});

it.each(["dialog", "sheet"])("detects a real shared %s rendered through a portal", async kind => {
  const { unmount } = render(<><Host />{kind === "dialog"
    ? <Dialog open><DialogPopup><DialogTitle>Edit</DialogTitle></DialogPopup></Dialog>
    : <Sheet open><SheetPopup side="bottom"><SheetTitle>Choose</SheetTitle></SheetPopup></Sheet>}
  </>);
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith(expect.any(String), { session: expect.any(String), active: true }));
  unmount();
  await act(async () => {});
});
