import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import App from "../App";
import { THEME_KEY } from "../storage/preferences";

let systemDark = false;
let listeners: Set<() => void>;
beforeEach(() => {
  localStorage.clear();
  systemDark = false;
  listeners = new Set();
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    get matches() { return systemDark; },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});
function openSettings() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
}
function choose(name: string) {
  fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${name}`) }));
}
function changeSystem(dark: boolean) {
  act(() => { systemDark = dark; listeners.forEach((listener) => listener()); });
}
it("persists appearance before a child exists and restores it on remount", () => {
  openSettings();
  choose("Dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  expect(document.documentElement).toHaveClass("dark");
  cleanup();
  openSettings();
  expect(screen.getByRole("radio", { name: /^Dark/ })).toBeChecked();
  expect(document.documentElement.style.colorScheme).toBe("dark");
});
it("follows system changes only when System is selected", () => {
  openSettings();
  changeSystem(true);
  expect(document.documentElement).toHaveClass("dark");
  choose("Light");
  changeSystem(false);
  changeSystem(true);
  expect(document.documentElement).not.toHaveClass("dark");
  choose("System");
  expect(document.documentElement).toHaveClass("dark");
  cleanup();
  expect(listeners.size).toBe(0);
});
it("keeps the session usable and reports when preferences cannot be saved", () => {
  openSettings();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
  choose("Dark");
  expect(document.documentElement).toHaveClass("dark");
  expect(screen.getByRole("alert")).toHaveTextContent("could not save");
  expect(localStorage.getItem(THEME_KEY)).toBeNull();
});
it("updates from another window and treats cleared preferences as System", () => {
  openSettings();
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY, newValue: "dark", storageArea: localStorage })));
  expect(screen.getByRole("radio", { name: /^Dark/ })).toBeChecked();
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: localStorage })));
  expect(screen.getByRole("radio", { name: /^System/ })).toBeChecked();
});
it("exposes settings from the workspace without a record-creation action", () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Child’s name"), { target: { value: "Test child" } });
  fireEvent.change(screen.getByLabelText("Birthday"), { target: { value: "2026-01-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Add child" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Settings" })[0]);
  expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Create record type/ })).not.toBeInTheDocument();
});
it("applies saved appearance in the document bootstrap before React starts", () => {
  const html = readFileSync("index.html", "utf8");
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(bootstrap).toBeTruthy();
  localStorage.setItem(THEME_KEY, "dark");
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  document.head.append(meta);
  try {
    new Function(bootstrap!)();
    expect(document.documentElement).toHaveClass("dark");
    expect(meta.content).toBe("#111111");
    localStorage.setItem(THEME_KEY, "light");
    systemDark = true;
    new Function(bootstrap!)();
    expect(document.documentElement).not.toHaveClass("dark");
  } finally { meta.remove(); }
});
