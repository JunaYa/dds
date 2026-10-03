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
  fireEvent.click(screen.getByRole("button", { name: "＋ Add a record" }));
  fireEvent.click(screen.getByRole("button", { name: "Start nursing" }));
  expect(
    screen.getByRole("dialog", { name: "Nursing on the left" }),
  ).toBeInTheDocument();
}

it("saves the two sides and timestamps atomically after pausing and resuming", () => {
  render(<App />);
  startNursing();
  vi.mocked(Date.now).mockReturnValue(start + 60000);
  fireEvent.click(screen.getByRole("button", { name: "Switch sides" }));
  expect(
    screen.getByRole("heading", { name: "Nursing on the right" }),
  ).toBeInTheDocument();
  vi.mocked(Date.now).mockReturnValue(start + 90000);
  fireEvent.click(screen.getByRole("button", { name: "Pause", exact: true }));
  expect(screen.getByLabelText("Total duration")).toHaveTextContent("1:30");
  vi.mocked(Date.now).mockReturnValue(start + 180000);
  fireEvent.click(screen.getByRole("button", { name: "Resume", exact: true }));
  vi.mocked(Date.now).mockReturnValue(start + 190000);
  fireEvent.click(
    screen.getByRole("button", { name: "Finish and save nursing" }),
  );
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
  fireEvent.click(
    screen.getByRole("button", { name: "Minimize nursing timer" }),
  );
  expect(loadWorkspace().data.session?.started).toBe(start);
  app.unmount();
  vi.mocked(Date.now).mockReturnValue(start + 466000);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open nursing timer" }));
  expect(
    screen.getByRole("timer", { name: "Current side duration" }),
  ).toHaveTextContent("7:46");
});

it("requires confirmation to discard and keeps the timer if saving fails", () => {
  render(<App />);
  startNursing();
  fireEvent.click(
    screen.getByRole("button", { name: "Discard this nursing session" }),
  );
  const dialog = screen.getByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Keep timer" }));
  expect(loadWorkspace().data.session).not.toBeNull();
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("full");
    });
  fireEvent.click(
    screen.getByRole("button", { name: "Finish and save nursing" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  expect(loadWorkspace().data.session).not.toBeNull();
  expect(loadWorkspace().data.records).toHaveLength(0);
  write.mockRestore();
  fireEvent.click(
    screen.getByRole("button", { name: "Discard this nursing session" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Discard timer", exact: true }),
  );
  expect(loadWorkspace().data.session).toBeNull();
  expect(loadWorkspace().data.records).toHaveLength(0);
});

it("edits the record start time without rewriting measured side durations", () => {
  render(<App />);
  startNursing();
  vi.mocked(Date.now).mockReturnValue(start + 60000);
  fireEvent.click(screen.getByRole("button", { name: "Pause", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Edit start time" }));
  fireEvent.click(screen.getByRole("button", { name: "Enter time manually" }));
  const input = screen.getByLabelText("Start time", {
    exact: true,
    selector: "input",
  });
  fireEvent.change(input, { target: { value: "2026-09-19T08:20" } });
  fireEvent.click(screen.getByRole("button", { name: "Save time" }));
  expect(loadWorkspace().data.session?.time).toBe("2026-09-19T08:20");
  expect(loadWorkspace().data.session?.nursing?.left).toBe(60);
});

it("keeps the mini timer available across pages and resumes the selected side", () => {
  render(<App />);
  startNursing();
  vi.mocked(Date.now).mockReturnValue(start + 10000);
  fireEvent.click(
    screen.getByRole("button", { name: "Minimize nursing timer" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Pause nursing timer" }));
  fireEvent.click(screen.getByRole("button", { name: "Switch sides" }));
  expect(loadWorkspace().data.session).toMatchObject({
    started: null,
    nursing: { side: "right", left: 10, right: 0 },
  });
  fireEvent.click(
    screen.getAllByRole("button", { name: "Supplies", exact: true })[0],
  );
  vi.mocked(Date.now).mockReturnValue(start + 60000);
  fireEvent.click(screen.getByRole("button", { name: "Resume nursing timer" }));
  vi.mocked(Date.now).mockReturnValue(start + 65000);
  fireEvent.click(screen.getByRole("button", { name: "Open nursing timer" }));
  expect(
    screen.getByRole("heading", { name: "Nursing on the right" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("timer")).toHaveTextContent("0:05");
  fireEvent.click(
    screen.getByRole("button", { name: "Finish and save nursing" }),
  );
  expect(loadWorkspace().data.records[0].nursing).toMatchObject({
    leftSeconds: 10,
    rightSeconds: 5,
  });
});

it("discards unsaved wheel edits and saves the currently selected minute", () => {
  render(<App />);
  startNursing();
  const original = loadWorkspace().data.session!.time;
  fireEvent.click(screen.getByRole("button", { name: "Edit start time" }));
  fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Start minute" }), {
    key: "ArrowUp",
  });
  expect(
    screen.getByRole("spinbutton", { name: "Start minute" }),
  ).toHaveAttribute("aria-valuetext", "27");
  fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
  expect(loadWorkspace().data.session!.time).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Edit start time" }));
  expect(
    screen.getByRole("spinbutton", { name: "Start minute" }),
  ).toHaveAttribute("aria-valuetext", "28");
  fireEvent.scroll(screen.getByRole("spinbutton", { name: "Start minute" }), {
    target: { scrollTop: 26 * 32 },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save time" }));
  expect(loadWorkspace().data.session!.time).toBe(`${original.slice(0, 14)}26`);
});
