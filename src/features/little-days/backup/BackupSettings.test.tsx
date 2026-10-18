import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../App";
import { emptyWorkspace } from "../domain/model";
import { STORAGE_KEY } from "../storage/workspace";
import { exportBackup } from "./backup";
import { saveBackupFile } from "./files";
vi.mock("./files", () => ({ saveBackupFile: vi.fn().mockResolvedValue(true) }));
beforeEach(() => { localStorage.clear(); vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function fixture() {
  const data = emptyWorkspace();
  data.child = "baby";
  data.children = [{ id: "baby", name: "Imported baby", birthday: "2026-09-01" }];
  data.records = [{ id: "r", child: "baby", type: "feed", time: "2026-10-01T10:00", note: "", values: { amount: 120 } }];
  return data;
}
function open() { render(<App />); fireEvent.click(screen.getByRole("button", { name: "Settings" })); }
async function choose(text = exportBackup(fixture())) {
  fireEvent.change(screen.getByLabelText("Import backup"), { target: { files: [{ size: text.length, text: async () => text }] } });
  await screen.findByRole("button", { name: "Confirm import" });
}
it("previews and cancels without writes, then commits the import and exports the saved workspace", async () => {
  open();
  await choose();
  expect(screen.getByText(/1 new profiles, 1 new records/)).toBeInTheDocument();
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  await choose();
  fireEvent.click(screen.getByRole("button", { name: "Confirm import" }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Export backup" }));
  await waitFor(() => expect(saveBackupFile).toHaveBeenCalled());
  expect(JSON.parse(vi.mocked(saveBackupFile).mock.calls.at(-1)![0]).workspace.records).toHaveLength(1);
});
it("keeps existing storage intact on save failure", async () => {
  const original = JSON.stringify(emptyWorkspace());
  localStorage.setItem(STORAGE_KEY, original);
  open(); await choose();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  fireEvent.click(screen.getByRole("button", { name: "Confirm import" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Existing data has not changed");
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
});
it("reports malformed files without enabling confirmation", async () => {
  open();
  fireEvent.change(screen.getByLabelText("Import backup"), { target: { files: [{ size: 3, text: async () => "bad" }] } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was imported");
  expect(screen.queryByRole("button", { name: "Confirm import" })).not.toBeInTheDocument();
});
it("displays imported records and preserves photos and source metadata when editing", async () => {
  const data = fixture();
  data.records[0].photos = ["data:image/jpeg;base64,/9j/AA=="];
  data.records[0].source = { format: "calibaby", data: { original: "kept" } };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  render(<App />);
  expect(screen.getByText("120 mL")).toBeInTheDocument();
  expect(screen.getByAltText("Record photo")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit Feeding at 10:00" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records[0]).toMatchObject({ photos: data.records[0].photos, source: data.records[0].source });
});
it("requires confirmation for replacement and can restore the pre-import snapshot", async () => {
  const original = fixture(); original.records[0].id = "older"; original.records[0].values.amount = 90;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(original));
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "Settings" })[0]);
  await choose();
  fireEvent.click(screen.getByRole("radio", { name: "Replace selected children’s records" }));
  expect(screen.getByRole("button", { name: "Confirm import" })).toBeDisabled();
  expect(screen.getByText(/remove all 1 existing records/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "I confirm replacing these records." }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm import" }));
  await screen.findByRole("button", { name: "Restore recovery backup" });
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records.map((r: { id: string }) => r.id)).toEqual(["r"]);
  expect(screen.getByRole("button", { name: "Restore recovery backup" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Restore all data to this snapshot/ }));
  fireEvent.click(screen.getByRole("button", { name: "Restore recovery backup" }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records).toEqual(original.records);
});
