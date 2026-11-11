import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Button } from "@vita/ui/button";
import { LocaleProvider } from "../../i18n/LocaleProvider";
import { useI18n } from "../../i18n/useI18n";
import { WorkspaceProvider } from "../../state/WorkspaceProvider";
import { emptyWorkspace } from "../../domain/model";
import { saveWorkspace } from "../../storage/workspace";
import { LOCALE_KEY } from "../../storage/locale";
import { ChildPicker } from "./ChildPicker";

function Header() {
  const { changeLocale } = useI18n();
  return <>
    <ChildPicker />
    <Button onClick={() => changeLocale("en")}>English</Button>
  </>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 31, 23, 59));
  localStorage.clear();
  localStorage.setItem(LOCALE_KEY, "zh-CN");
  const data = emptyWorkspace();
  data.children = [
    { id: "baby", name: "Baby", birthday: "2026-01-01" },
    { id: "sibling", name: "Sibling", birthday: "2025-10-01" },
  ];
  data.child = "baby";
  saveWorkspace(data, null);
});
afterEach(() => vi.useRealTimers());

function mount() {
  render(<LocaleProvider><WorkspaceProvider><Header /></WorkspaceProvider></LocaleProvider>);
}

it("shows the selected child's localized age beside their name", () => {
  mount();
  expect(within(screen.getByRole("combobox")).getByRole("option", { selected: true })).toHaveTextContent("Baby · 30 天");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "sibling" } });
  expect(within(screen.getByRole("combobox")).getByRole("option", { selected: true })).toHaveTextContent("Sibling · 3 个月 4 周");
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  expect(within(screen.getByRole("combobox")).getByRole("option", { selected: true })).toHaveTextContent("Sibling · 3 months, 4 weeks");
});

it("updates the age stage when the app resumes on a new calendar day", () => {
  mount();
  act(() => {
    vi.setSystemTime(new Date(2026, 1, 1, 0, 1));
    window.dispatchEvent(new Event("focus"));
  });
  expect(within(screen.getByRole("combobox")).getByRole("option", { selected: true })).toHaveTextContent("Baby · 1 个月");
});
