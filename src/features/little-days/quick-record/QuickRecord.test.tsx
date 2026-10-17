import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../App";
import { emptyWorkspace } from "../domain/model";
import { loadWorkspace, saveWorkspace } from "../storage/workspace";

const native = vi.hoisted(() => ({
  invoke: vi.fn(),
  listeners: new Map<string, () => void>(),
  status: { supported: true, enabled: true, shortcut: "CommandOrControl+Shift+Space", error: null },
}));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true, invoke: native.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (name: string, callback: () => void) => {
  native.listeners.set(name, callback);
  return () => native.listeners.delete(name);
}) }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  localStorage.clear();
  native.listeners.clear();
  native.invoke.mockReset();
  native.invoke.mockImplementation(async (name, args) => {
    if (name === "quick_record_status") return native.status;
    if (name === "set_quick_record_shortcut") return { ...native.status, enabled: !!args.shortcut, shortcut: args.shortcut ?? native.status.shortcut };
  });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  const data = emptyWorkspace();
  data.children = [{ id: "baby", name: "Baby", birthday: "2026-01-01" }];
  data.child = "baby";
  saveWorkspace(data, null);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function open() {
  render(<App />);
  await waitFor(() => expect(native.listeners.has("quick-record-open")).toBe(true));
  await act(async () => native.listeners.get("quick-record-open")?.());
  return within(screen.getByRole("dialog", { name: "Quick recording" }));
}

it("opens a bottom sheet, saves repeatedly, and keeps the recorder open until explicitly closed", async () => {
  const dialog = await open();
  const user = userEvent.setup();
  const status = dialog.getAllByRole('status').find((element) => element.classList.contains('quick-recorder-status'))!;
  await user.keyboard("2");
  expect(screen.getByRole("radio", { name: "Wet", exact: true })).toHaveFocus();
  await user.click(screen.getByRole("radio", { name: "Wet", exact: true }));
  await user.keyboard("{Control>}{Enter}{/Control}");
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Diaper" })).not.toBeInTheDocument());
  expect(screen.getByRole("dialog", { name: "Quick recording" })).toBeVisible();
  expect(loadWorkspace().data.records[0].values).toEqual({ kind: "Wet", times: 1 });
  expect(native.invoke).not.toHaveBeenCalledWith("present_quick_record", { open: false });
  expect(dialog.getAllByRole('status').find((element) => element.classList.contains('quick-recorder-status'))!).toBe(status);
  await user.click(dialog.getByRole("button", { name: /^Diaper\s*2$/ }));
  expect(status).toBeInTheDocument();
  expect(status).toHaveTextContent('');
  expect(screen.getByRole("dialog", { name: "Diaper" })).toHaveAttribute("data-slot", "sheet-popup");
  await user.click(screen.getByRole("radio", { name: "Dirty", exact: true }));
  await user.keyboard("{Control>}{Enter}{/Control}");
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Diaper" })).not.toBeInTheDocument());
  expect(loadWorkspace().data.records).toHaveLength(2);
  expect(native.invoke).not.toHaveBeenCalledWith("present_quick_record", { open: false });
  await user.click(dialog.getByRole("button", { name: "Close Esc" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Quick recording" })).not.toBeInTheDocument());
  expect(native.invoke).toHaveBeenCalledWith("present_quick_record", { open: false });
});

it("keeps a draft on Escape and does not use typed numbers as record shortcuts", async () => {
  const dialog = await open();
  const user = userEvent.setup();
  await user.keyboard("1");
  await user.type(screen.getByLabelText(/Amount/), "120");
  expect(screen.getByLabelText(/Amount/)).toHaveValue(120);
  await user.keyboard("{Escape}");
  expect(dialog.getByText("Press 1–9 to choose a record type")).toBeVisible();
  await user.keyboard("1");
  expect(screen.getByLabelText(/Amount/)).toHaveValue(120);
  await user.keyboard("{Escape}{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Quick recording" })).not.toBeInTheDocument());
  expect(loadWorkspace().data.records).toHaveLength(0);
});

it("keeps the form and native overlay open after a failed save", async () => {
  const dialog = await open();
  const user = userEvent.setup();
  await user.keyboard("2");
  await user.click(screen.getByRole("radio", { name: "Dirty", exact: true }));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
  await user.keyboard("{Control>}{Enter}{/Control}");
  expect(screen.getByRole("radio", { name: "Dirty", exact: true })).toBeChecked();
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  expect(native.invoke).not.toHaveBeenCalledWith("present_quick_record", { open: false });
  expect(loadWorkspace().data.records).toHaveLength(0);
});

it("uses the current local time on every opening while preserving other draft fields", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 10, 9, 15));
  await open();
  const user = userEvent.setup();
  await user.keyboard("1");
  expect(screen.getByLabelText("When")).toHaveValue("2026-10-10 09:15");
  await user.type(screen.getByLabelText(/Amount/), "120");
  vi.setSystemTime(new Date(2026, 9, 10, 9, 20));
  expect(screen.getByLabelText("When")).toHaveValue("2026-10-10 09:15");
  await user.keyboard("{Escape}");
  await user.keyboard("1");
  expect(screen.getByLabelText("When")).toHaveValue("2026-10-10 09:20");
  expect(screen.getByLabelText(/Amount/)).toHaveValue(120);
  await user.keyboard("{Control>}{Enter}{/Control}");
  await waitFor(() => expect(loadWorkspace().data.records).toHaveLength(1));
  expect(loadWorkspace().data.records[0].time).toBe("2026-10-10T09:20");
  vi.setSystemTime(new Date(2026, 9, 10, 10, 30));
  await user.keyboard("1");
  expect(screen.getByLabelText("When")).toHaveValue("2026-10-10 10:30");
});

it("captures a custom shortcut and leaves the active shortcut intact on conflict", async () => {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "Settings", exact: true })[0]);
  const field = await screen.findByLabelText("Global shortcut");
  fireEvent.keyDown(field, { key: "k", code: "KeyK", ctrlKey: true, shiftKey: true });
  expect(field).toHaveValue("Ctrl + Shift + K");
  native.invoke.mockRejectedValueOnce(new Error("Shortcut already registered"));
  fireEvent.click(screen.getByRole("button", { name: "Save shortcut" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Try another combination");
  expect(screen.getByText("Shortcut enabled")).toBeVisible();
});

it("defaults to feeding and navigates the rendered grid with all four arrow keys", async () => {
  const dialog = await open();
  const user = userEvent.setup();
  const buttons = within(dialog.getByRole("region", { name: "Choose a record type" })).getAllByRole("button");
  buttons.forEach((button, index) => {
    Object.defineProperty(button, "offsetTop", { configurable: true, value: Math.floor(index / 3) * 92 });
  });
  expect(buttons[0]).toHaveFocus();
  expect(buttons[0]).toHaveAttribute("aria-current", "true");
  await user.keyboard("{ArrowLeft}{ArrowUp}");
  expect(buttons[0]).toHaveFocus();
  await user.keyboard("{ArrowRight}{ArrowDown}");
  expect(buttons[4]).toHaveFocus();
  expect(buttons[4]).toHaveAttribute("aria-current", "true");
  expect(buttons[0]).not.toHaveAttribute("aria-current");
  await user.keyboard("{ArrowDown}{ArrowDown}{ArrowRight}");
  expect(buttons[6]).toHaveFocus();
  await user.keyboard("{ArrowUp}{ArrowLeft}{ArrowLeft}{Enter}");
  expect(screen.getByRole("radio", { name: "Wet", exact: true })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(buttons[1]).toHaveFocus();
  expect(buttons[1]).toHaveAttribute("aria-current", "true");
});

it("offers a dark night view with a neutral glow when history is insufficient", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 10, 22));
  await open();
  const dialog = screen.getByRole("dialog", { name: "Quick recording" });
  expect(dialog).toHaveClass("quick-recorder-night");
  expect(dialog.querySelector(".night-edge-glow")).toHaveAttribute("data-signal", "neutral");
  expect(screen.getByText("No active sleep timer")).toBeVisible();
  await userEvent.setup().click(screen.getByRole("button", { name: "Night view" }));
  expect(dialog).not.toHaveClass("quick-recorder-night");
  expect(dialog.querySelector(".night-edge-glow")).toBeNull();
});

it("edits individual widgets and restores the layout after reopening", async () => {
  const dialog = await open();
  const user = userEvent.setup();
  await user.click(dialog.getByRole('button', { name: 'Edit widgets' }));
  expect(screen.queryByLabelText('Size of Time')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Options for Diaper' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Remove Diaper' }));
  expect(screen.getByRole('button', { name: 'Add Diaper' })).toBeVisible();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Drag Sleep' })).toHaveFocus());
  await user.keyboard('2');
  expect(screen.queryByRole('dialog', { name: 'Diaper' })).toBeNull();
  await user.keyboard('{Escape}');
  expect(dialog.getByRole('button', { name: 'Edit widgets' })).toBeVisible();
  await user.click(dialog.getByRole('button', { name: 'Close Esc' }));
  await act(async () => native.listeners.get('quick-record-open')?.());
  expect(screen.getByRole('region', { name: 'Time', exact: true })).toHaveAttribute('data-size', 'medium');
  expect(screen.queryByRole('button', { name: /^Diaper\s*2$/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Edit widgets' }));
  await user.click(screen.getByRole('button', { name: 'Add Diaper' }));
  await user.click(screen.getByRole('button', { name: 'Restore default layout' }));
  await user.click(screen.getByRole('button', { name: 'Done editing' }));
  expect(screen.getByRole('region', { name: 'Time', exact: true })).toHaveAttribute('data-size', 'medium');
  await user.click(screen.getByRole('button', { name: /^Diaper\s*2$/ }));
  expect(screen.getByRole('radio', { name: 'Wet', exact: true })).toHaveFocus();
});

it('cancels dragging before exiting widget editing', async () => {
  const dialog = await open();
  const user = userEvent.setup();
  await user.click(dialog.getByRole('button', { name: 'Edit widgets' }));
  const handle = screen.getByRole('button', { name: 'Drag Time' });
  handle.focus();
  await user.keyboard('[Space]');
  expect(document.querySelector('[data-dragging]')).not.toBeNull();
  await user.keyboard('[Escape]');
  expect(document.querySelector('[data-dragging]')).toBeNull();
  expect(dialog.getByRole('button', { name: 'Done editing' })).toBeVisible();
});

it('shows feeding elapsed time inside the feeding action instead of a separate widget', async () => {
  const dialog = await open();
  const feeding = dialog.getByRole('button', { name: /^Feeding\s*1$/ });
  expect(within(feeding).getByText('Since last recorded feeding')).toBeVisible();
  expect(dialog.queryByRole('region', { name: 'Since last recorded feeding' })).toBeNull();
  await userEvent.setup().click(feeding);
  expect(screen.getByLabelText(/Amount/)).toBeVisible();
});

it('shows the timer within the sleep action and opens its record form', async () => {
  const dialog = await open();
  const sleep = dialog.getByRole('button', { name: /^Sleep\s*3$/ });
  expect(within(sleep).getByText('No active sleep timer')).toBeVisible();
  expect(dialog.queryByRole('region', { name: 'Sleep timer' })).toBeNull();
  await userEvent.setup().click(sleep);
  expect(screen.getByRole('dialog', { name: 'Sleep', exact: true })).toBeVisible();
});
