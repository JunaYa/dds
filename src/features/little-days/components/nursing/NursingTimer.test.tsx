import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "../../App";
import { emptyWorkspace } from "../../domain/model";
import { loadWorkspace, saveWorkspace } from "../../storage/workspace";

const start = new Date("2026-09-19T10:28:00.000Z").getTime();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(start);
  localStorage.clear();
  const data = emptyWorkspace();
  data.children = [{ id: "baby", name: "Baby", birthday: "2026-01-01" }];
  data.child = "baby";
  saveWorkspace(data, null);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })),
  });
  vi.spyOn(Date, "now").mockReturnValue(start);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function startNursing() {
  fireEvent.click(screen.getByRole("button", { name: "开始亲喂" }));
  expect(
    screen.getByRole("dialog", { name: "左侧亲喂中" }),
  ).toBeInTheDocument();
}

it("saves the two sides and timestamps atomically after pausing and resuming", () => {
  render(<App />);
  startNursing();
  vi.mocked(Date.now).mockReturnValue(start + 60000);
  fireEvent.click(screen.getByRole("button", { name: "切换左右侧" }));
  expect(
    screen.getByRole("heading", { name: "右侧亲喂中" }),
  ).toBeInTheDocument();
  vi.mocked(Date.now).mockReturnValue(start + 90000);
  fireEvent.click(screen.getByRole("button", { name: "暂停", exact: true }));
  expect(screen.getByLabelText("总计时长")).toHaveTextContent("1:30");
  vi.mocked(Date.now).mockReturnValue(start + 180000);
  fireEvent.click(screen.getByRole("button", { name: "继续", exact: true }));
  vi.mocked(Date.now).mockReturnValue(start + 190000);
  fireEvent.click(screen.getByRole("button", { name: "结束并保存亲喂" }));
  const saved = loadWorkspace().data;
  expect(saved.session).toBeNull();
  expect(saved.records).toHaveLength(1);
  expect(saved.records[0]).toMatchObject({
    child: "baby",
    values: { method: "Nursing", duration: 1.7 },
    nursing: {
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(start + 190000).toISOString(),
      leftSeconds: 60,
      rightSeconds: 40,
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Edit Feeding/ }));
  expect(screen.getByText("1:00")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(loadWorkspace().data.records[0].nursing).toEqual(
    saved.records[0].nursing,
  );
});

it("can minimize and restore a running session after reload", () => {
  const app = render(<App />);
  startNursing();
  fireEvent.click(screen.getByRole("button", { name: "收起亲喂计时" }));
  expect(loadWorkspace().data.session?.started).toBe(start);
  app.unmount();
  vi.mocked(Date.now).mockReturnValue(start + 466000);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "打开亲喂计时" }));
  expect(screen.getByRole("timer", { name: "当前侧时长" })).toHaveTextContent(
    "7:46",
  );
});

it("requires confirmation to discard and keeps the timer if saving fails", () => {
  render(<App />);
  startNursing();
  fireEvent.click(screen.getByRole("button", { name: "丢弃本次亲喂" }));
  const dialog = screen.getByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "保留计时" }));
  expect(loadWorkspace().data.session).not.toBeNull();
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("full");
    });
  fireEvent.click(screen.getByRole("button", { name: "结束并保存亲喂" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  expect(loadWorkspace().data.session).not.toBeNull();
  expect(loadWorkspace().data.records).toHaveLength(0);
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "丢弃本次亲喂" }));
  fireEvent.click(
    screen.getByRole("button", { name: "丢弃计时", exact: true }),
  );
  expect(loadWorkspace().data.session).toBeNull();
  expect(loadWorkspace().data.records).toHaveLength(0);
});

it("edits the record start time without rewriting measured side durations", () => {
  render(<App />);
  startNursing();
  vi.mocked(Date.now).mockReturnValue(start + 60000);
  fireEvent.click(screen.getByRole("button", { name: "暂停", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "修改开始时间" }));
  fireEvent.click(screen.getByRole("button", { name: "手动输入时间" }));
  const input = screen.getByLabelText("开始时间", {
    exact: true,
    selector: "input",
  });
  fireEvent.change(input, { target: { value: "2026-09-19T08:20" } });
  fireEvent.click(screen.getByRole("button", { name: "保存时间" }));
  expect(loadWorkspace().data.session?.time).toBe("2026-09-19T08:20");
  expect(loadWorkspace().data.session?.nursing?.left).toBe(60);
});

it("keeps the mini timer available across pages and resumes the selected side", () => {
  render(<App />);
  startNursing();
  vi.mocked(Date.now).mockReturnValue(start + 10000);
  fireEvent.click(screen.getByRole("button", { name: "收起亲喂计时" }));
  fireEvent.click(screen.getByRole("button", { name: "暂停亲喂计时" }));
  fireEvent.click(screen.getByRole("button", { name: "切换左右侧" }));
  expect(loadWorkspace().data.session).toMatchObject({
    started: null,
    nursing: { side: "right", left: 10, right: 0 },
  });
  fireEvent.click(
    screen.getAllByRole("button", { name: "Supplies", exact: true })[0],
  );
  vi.mocked(Date.now).mockReturnValue(start + 60000);
  fireEvent.click(screen.getByRole("button", { name: "继续亲喂计时" }));
  vi.mocked(Date.now).mockReturnValue(start + 65000);
  fireEvent.click(screen.getByRole("button", { name: "打开亲喂计时" }));
  expect(
    screen.getByRole("heading", { name: "右侧亲喂中" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("timer")).toHaveTextContent("0:05");
  fireEvent.click(screen.getByRole("button", { name: "结束并保存亲喂" }));
  expect(loadWorkspace().data.records[0].nursing).toMatchObject({
    leftSeconds: 10,
    rightSeconds: 5,
  });
});

it("discards unsaved wheel edits and saves the currently selected minute", () => {
  render(<App />);
  startNursing();
  const original = loadWorkspace().data.session!.time;
  fireEvent.click(screen.getByRole("button", { name: "修改开始时间" }));
  fireEvent.keyDown(screen.getByRole("spinbutton", { name: "开始分钟" }), {
    key: "ArrowUp",
  });
  expect(screen.getByRole("spinbutton", { name: "开始分钟" })).toHaveAttribute(
    "aria-valuetext",
    "27",
  );
  fireEvent.click(screen.getByRole("button", { name: "取消", exact: true }));
  expect(loadWorkspace().data.session!.time).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "修改开始时间" }));
  expect(screen.getByRole("spinbutton", { name: "开始分钟" })).toHaveAttribute(
    "aria-valuetext",
    "28",
  );
  fireEvent.scroll(screen.getByRole("spinbutton", { name: "开始分钟" }), {
    target: { scrollTop: 26 * 32 },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存时间" }));
  expect(loadWorkspace().data.session!.time).toBe(`${original.slice(0, 14)}26`);
});
