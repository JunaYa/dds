import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { loadWorkspace, STORAGE_KEY } from "./storage";

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })),
  });
});
async function createChild() {
  fireEvent.change(screen.getByLabelText("Child’s name"), {
    target: { value: "Test baby" },
  });
  fireEvent.change(screen.getByLabelText("Birthday"), {
    target: { value: "2026-01-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add child" }));
}
it("creates a real family and preserves a saved record across remount", async () => {
  const app = render(<App />);
  expect(screen.queryByText(/Milo/)).not.toBeInTheDocument();
  await createChild();
  fireEvent.change(screen.getByLabelText(/Amount/), {
    target: { value: "120" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(loadWorkspace().data.records[0].values.amount).toBe(120);
  app.unmount();
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Test baby’s little day" }),
  ).toBeInTheDocument();
  expect(screen.getByText("120 mL")).toBeInTheDocument();
});
it("restores a running timer and finishes it only once", async () => {
  const app = render(<App />);
  await createChild();
  fireEvent.click(
    screen.getByRole("button", { name: "Start live feeding timer" }),
  );
  expect(loadWorkspace().data.session?.type).toBe("feed");
  app.unmount();
  render(<App />);
  expect(screen.getByText("Timer running")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  expect(loadWorkspace().data.session?.started).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Finish & save" }));
  expect(loadWorkspace().data.session).toBeNull();
  expect(loadWorkspace().data.records).toHaveLength(1);
});
it("keeps input and reports a failed storage write", async () => {
  render(<App />);
  await createChild();
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
  fireEvent.change(screen.getByLabelText(/Amount/), {
    target: { value: "90" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  expect(screen.getByLabelText(/Amount/)).toHaveValue(90);
  expect(loadWorkspace().data.records).toHaveLength(0);
  write.mockRestore();
});
it("adds custom fields and supplies through the real forms", async () => {
  const user = userEvent.setup();
  render(<App />);
  await createChild();
  await user.click(
    screen.getAllByRole("button", { name: "Record types", exact: true })[0],
  );
  await user.click(screen.getByRole("button", { name: /Create record type/ }));
  const dialog = within(screen.getByRole("dialog"));
  await user.type(dialog.getByLabelText("Record name"), "Outdoor play");
  await user.click(dialog.getByRole("button", { name: "＋ Counter" }));
  await user.click(
    dialog.getByRole("button", { name: "Create record type", exact: true }),
  );
  expect(loadWorkspace().data.types.at(-1)?.fields).toHaveLength(2);
  await user.click(
    screen.getAllByRole("button", { name: "Supplies", exact: true })[0],
  );
  await user.click(screen.getByRole("button", { name: "＋ Add supply" }));
  const supply = within(screen.getByRole("dialog"));
  await user.type(supply.getByLabelText("Supply name"), "Wet wipes");
  fireEvent.change(supply.getByLabelText("Quantity in stock"), {
    target: { value: "4" },
  });
  await user.click(supply.getByRole("button", { name: "Save supply" }));
  await user.click(screen.getByRole("button", { name: "Use 1" }));
  expect(loadWorkspace().data.supplies[0].stock).toBe(3);
});
it("does not overwrite unreadable stored data on startup", () => {
  localStorage.setItem(STORAGE_KEY, "{broken");
  render(<App />);
  expect(screen.getByRole("alert")).toHaveTextContent("could not be opened");
  expect(localStorage.getItem(STORAGE_KEY)).toBe("{broken");
});

it("keeps a timer with its original child and supports delete with Undo", async () => {
  const user = userEvent.setup();
  render(<App />);
  await createChild();
  const firstChild = loadWorkspace().data.child;
  await user.click(
    screen.getByRole("button", { name: "Start live feeding timer" }),
  );
  await user.click(
    screen.getAllByRole("button", { name: "Add child", exact: true })[0],
  );
  const dialog = within(screen.getByRole("dialog"));
  await user.type(dialog.getByLabelText("Child’s name"), "Sibling");
  fireEvent.change(dialog.getByLabelText("Birthday"), {
    target: { value: "2025-01-01" },
  });
  await user.click(dialog.getByRole("button", { name: "Add child" }));
  await user.click(screen.getByRole("button", { name: "Finish & save" }));
  expect(loadWorkspace().data.records[0].child).toBe(firstChild);
  expect(screen.getByText("0 records")).toBeInTheDocument();
  fireEvent.change(screen.getAllByLabelText("Child", { exact: true })[0], {
    target: { value: firstChild },
  });
  await user.click(screen.getByRole("button", { name: /^Feeding.*min$/ }));
  await user.click(screen.getByRole("button", { name: "Delete record" }));
  expect(loadWorkspace().data.records).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Undo" }));
  expect(loadWorkspace().data.records).toHaveLength(1);
});
