import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { WorkspaceProvider } from "./context";
import { loadTasks, storageKey } from "./storage";

describe("collage list", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });
  it("creates a composed task, searches immediately, and restores it on remount", async () => {
    const user = userEvent.setup();
    const view = render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    );
    await user.click(screen.getByRole("button", { name: "＋ 新建任务" }));
    await user.type(screen.getByLabelText("任务名称"), "喝水");
    await user.click(screen.getByRole("button", { name: "＋ 计数" }));
    await user.click(screen.getByRole("button", { name: "＋ 循环" }));
    await user.click(screen.getByRole("button", { name: "保存组合" }));
    await waitFor(() => expect(loadTasks().tasks[0]?.title).toBe("喝水"));
    await user.click(screen.getByRole("button", { name: "增加喝水次数" }));
    await waitFor(() => expect(loadTasks().tasks[0]?.value).toBe(1));
    await user.type(screen.getByLabelText("查找任务"), "不匹配");
    expect(
      screen.queryByRole("button", { name: "喝水", exact: true }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("查找任务"));
    expect(
      screen.getByRole("button", { name: "喝水", exact: true }),
    ).toBeInTheDocument();
    view.unmount();
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    );
    expect(
      screen.getByRole("button", { name: "喝水", exact: true }),
    ).toBeInTheDocument();
  });
  it("blocks changes when existing local data cannot be read", () => {
    localStorage.setItem(storageKey, "broken");
    render(
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("原有数据未被覆盖");
    expect(screen.getByRole("button", { name: "＋ 新建任务" })).toBeDisabled();
    expect(localStorage.getItem(storageKey)).toBe("broken");
  });
});
