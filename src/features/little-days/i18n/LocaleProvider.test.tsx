import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../App";
import { LOCALE_KEY } from "./LocaleProvider";
import { emptyWorkspace } from "../domain/model";
import {
  loadWorkspace,
  saveWorkspace,
  STORAGE_KEY,
} from "../storage/workspace";
import { typeName, fieldLabel } from "./record-labels";
import { translator } from "./translate";
import { messages } from "./messages";

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("switches language before onboarding and restores it after remount", () => {
  const app = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(screen.getByRole("radio", { name: "简体中文" }));
  expect(screen.getByRole("group", { name: "外观" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("zh-CN");
  expect(localStorage.getItem(LOCALE_KEY)).toBe("zh-CN");
  app.unmount();
  render(<App />);
  expect(screen.getByLabelText("宝宝姓名")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "设置" }));
  fireEvent.click(screen.getByRole("radio", { name: "English" }));
  expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("en");
});

it("defaults to the device language and falls back for unsupported or invalid preferences", () => {
  vi.spyOn(navigator, "language", "get").mockReturnValue("zh-TW");
  localStorage.setItem(LOCALE_KEY, "invalid");
  render(<App />);
  expect(screen.getByLabelText("宝宝姓名")).toBeInTheDocument();
  cleanup();
  vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
  render(<App />);
  expect(screen.getByLabelText("Child’s name")).toBeInTheDocument();
});

it("saves canonical choice values in Chinese and preserves records when switching to English", () => {
  const data = emptyWorkspace();
  data.children = [{ id: "baby", name: "宝宝 Alex", birthday: "2026-01-01" }];
  data.child = "baby";
  saveWorkspace(data, null);
  localStorage.setItem(LOCALE_KEY, "zh-CN");
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "喂养", exact: true }));
  fireEvent.change(screen.getByLabelText("喂养方式"), {
    target: { value: "Bottle" },
  });
  fireEvent.change(screen.getByLabelText("照护备注"), {
    target: { value: "Milk / 牛奶" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存记录" }));
  expect(loadWorkspace().data.records[0].values.method).toBe("Bottle");
  expect(screen.getByText("瓶喂")).toBeInTheDocument();
  const saved = localStorage.getItem(STORAGE_KEY);
  fireEvent.click(
    screen.getAllByRole("button", { name: "设置", exact: true })[0],
  );
  fireEvent.click(screen.getByRole("radio", { name: "English" }));
  expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Today", exact: true })[0],
  );
  expect(screen.getByText("Milk / 牛奶")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Edit Feeding/ }));
  expect(screen.getByLabelText("Method")).toHaveValue("Bottle");
});

it("syncs another window and reports preference write failure without blocking the UI", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: LOCALE_KEY,
        newValue: "zh-CN",
        storageArea: localStorage,
      }),
    ),
  );
  expect(screen.getByRole("group", { name: "语言" })).toBeInTheDocument();
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: null, storageArea: localStorage }),
    ),
  );
  expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Full");
  });
  fireEvent.click(screen.getByRole("radio", { name: "简体中文" }));
  expect(
    within(screen.getByRole("group", { name: "语言" })).getByRole("alert"),
  ).toHaveTextContent("无法保存");
  expect(document.documentElement.lang).toBe("zh-CN");
});

it("never translates user-defined names even when they match a message key", () => {
  const tr = translator("zh-CN");
  const custom = {
    ...emptyWorkspace().types[0],
    id: "custom",
    name: "Feeding",
  };
  expect(typeName(custom, tr)).toBe("Feeding");
  expect(fieldLabel(custom, custom.fields[0], tr)).toBe("Method");
});

it("keeps interpolation parameters consistent in both languages", () => {
  for (const [key, value] of Object.entries(messages)) {
    expect(value.match(/\{\w+\}/g)?.sort() ?? [], key).toEqual(
      key.match(/\{\w+\}/g)?.sort() ?? [],
    );
  }
});
