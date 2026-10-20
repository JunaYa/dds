import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../../App";
import { emptyWorkspace, today } from "../../domain/model";
import { saveWorkspace } from "../../storage/workspace";
import { LOCALE_KEY } from "../../storage/locale";

const platform = vi.hoisted(() => ({ ios: true, native: false, add: () => {} }));
vi.mock("./use-system-tabs", () => ({
  useSystemTabs: (_page: unknown, _titles: unknown, _blocked: unknown, _navigate: unknown,
    _theme: unknown, action: { onAdd: () => void }) => {
    platform.add = action.onAdd;
    return platform.native;
  },
}));
vi.mock("./ios-platform", () => ({ isIosApp: () => platform.ios }));

beforeEach(() => {
  platform.ios = true;
  platform.native = false;
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false, addEventListener() {}, removeEventListener() {},
    })),
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const data = emptyWorkspace();
  data.children = [
    { id: "baby", name: "Baby", birthday: "2026-01-01" },
    { id: "sibling", name: "Sibling", birthday: "2025-01-01" },
  ];
  data.child = "baby";
  data.records = [
    { id: "recent", child: "baby", type: "feed", time: `${today()}T08:00`, values: { amount: 120 }, note: "" },
    { id: "old", child: "baby", type: "feed", time: "2020-01-01T08:00", values: { amount: 90 }, note: "" },
    { id: "other", child: "sibling", type: "feed", time: `${today()}T08:00`, values: { amount: 80 }, note: "" },
    { id: "other-two", child: "sibling", type: "feed", time: `${today()}T10:00`, values: { amount: 90 }, note: "" },
    { id: "future", child: "baby", type: "feed", time: "2099-01-01T08:00", values: { amount: 80 }, note: "" },
  ];
  saveWorkspace(data, null);
});

it("provides three iOS destinations and preserves access to management pages", () => {
  localStorage.setItem(LOCALE_KEY, "zh-CN");
  render(<App />);
  const nav = within(screen.getByRole("navigation", { name: "主导航" }));
  expect(nav.getAllByRole("button").map(button => button.textContent)).toEqual(["随记", "分析", "我的"]);
  expect(screen.queryByRole("button", { name: "打开导航" })).not.toBeInTheDocument();
  fireEvent.click(nav.getByRole("button", { name: "分析", exact: true }));
  expect(screen.getByRole("heading", { name: "分析", level: 1 })).toBeInTheDocument();
  expect(nav.getByRole("button", { name: "分析", exact: true })).toHaveAttribute("aria-current", "page");
  fireEvent.click(nav.getByRole("button", { name: "我的", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "用品", exact: true }));
  expect(nav.getByRole("button", { name: "我的", exact: true })).toHaveAttribute("aria-current", "page");
  fireEvent.click(screen.getByRole("button", { name: "← 我的" }));
  expect(screen.getByRole("heading", { name: "我的", level: 1 })).toBeInTheDocument();
  fireEvent.click(nav.getByRole("button", { name: "随记" }));
  expect(screen.getByText("120 mL")).toBeInTheDocument();
});

it("summarizes only the selected child's recent entries and switches child without leaving analysis", () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Analysis", exact: true }));
  expect(container.querySelector(".analysis-summary dd")).toHaveTextContent(/^1$/);
  fireEvent.change(screen.getByLabelText("Child", { exact: true }), { target: { value: "sibling" } });
  expect(container.querySelector(".analysis-summary dd")).toHaveTextContent(/^2$/);
  expect(screen.getByRole("heading", { name: "Analysis", level: 1 })).toBeInTheDocument();
});

it("hides bottom navigation while a record dialog is open and restores it on cancel", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "＋ Add a record" }));
  expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  const close = screen.getByRole("button", { name: "Close dialog" });
  expect(close.querySelector("svg")).not.toBeNull();
  expect(close.textContent).toBe("");
  expect(document.querySelector('.care-dialog [data-slot="overlay-grabber"]')).not.toBeNull();
  fireEvent.click(close);
  expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "＋ Add a record" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
  expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
});

it("keeps the existing navigation outside the native iOS app", () => {
  platform.ios = false;
  render(<App />);
  expect(screen.queryByRole("button", { name: "Journal" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
});

it("preserves the shared profile and scrolls after the destination has rendered", () => {
  const { container } = render(<App />);
  const profile = container.querySelector(".ios-profile");
  const picker = screen.getByLabelText("Child", { exact: true });
  const titlesAtScroll: string[] = [];
  vi.mocked(window.scrollTo).mockImplementation(() => {
    titlesAtScroll.push(screen.getByRole("heading", { level: 1 }).textContent ?? "");
  });
  const nav = within(screen.getByRole("navigation", { name: "Main navigation" }));
  for (const destination of ["Analysis", "Profile", "Journal"]) {
    fireEvent.click(nav.getByRole("button", { name: destination, exact: true }));
    expect(container.querySelector(".ios-profile")).toBe(profile);
    expect(screen.getByLabelText("Child", { exact: true })).toBe(picker);
  }
  expect(titlesAtScroll).toEqual(["Analysis", "Profile", "Baby’s little day"]);
});


it("opens the native record chooser and hands the selected type to the record form", async () => {
  platform.native = true;
  render(<App />);
  act(() => platform.add());
  const chooser = await screen.findByRole("dialog", { name: "Capture a little moment" });
  expect(within(chooser).getByRole("button", { name: "Feeding", exact: true })).toBeInTheDocument();
  fireEvent.click(within(chooser).getByRole("button", { name: "Diaper", exact: true }));
  const form = await screen.findByRole("dialog", { name: "A little moment to remember" });
  expect(within(form).getByRole("combobox", { name: "Record type" })).toHaveValue("diaper");
  fireEvent.click(within(form).getByRole("button", { name: "Cancel", exact: true }));
  expect(screen.queryByRole("dialog", { name: "Capture a little moment" })).not.toBeInTheDocument();
});

it("dismisses the record chooser without opening a record", async () => {
  platform.native = true;
  render(<App />);
  act(() => platform.add());
  const chooser = await screen.findByRole("dialog", { name: "Capture a little moment" });
  fireEvent.click(within(chooser).getByRole("button", { name: "Cancel", exact: true }));
  expect(screen.queryByRole("dialog", { name: "A little moment to remember" })).not.toBeInTheDocument();
});

it("groups profile settings and opens only the selected child page", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Profile", exact: true }));
  expect(screen.getByRole("heading", { name: "Data and privacy" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Export backup" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Backup and restore" }));
  expect(window.location.hash).toBe("#/profile/backup");
  expect(screen.getByRole("button", { name: "Export backup" })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Appearance" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Profile", exact: true })).toHaveAttribute("aria-current", "page");
  fireEvent.click(screen.getByRole("button", { name: "← Profile" }));
  fireEvent.click(screen.getByRole("button", { name: "Language and appearance" }));
  expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Export backup" })).not.toBeInTheDocument();
});
