import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import catalog from "../../../../public/audio/catalog.json";
import { AudioResources } from "./AudioResources";
import { emptyState } from "~/audio/model";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("~/audio/AudioProvider", () => ({ useAudio: () => ({ state: emptyState, send }) }));
vi.mock("../i18n/useI18n", () => ({ useI18n: () => ({ tr: (text: string) => text }) }));
beforeEach(() => {
  send.mockReset().mockResolvedValue(true);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("catalog.json")) return { ok: true, json: async () => catalog };
    const resource = catalog.resources.find(item => url.endsWith(item.assetPath));
    if (!resource) throw new Error("Unexpected asset request");
    const bytes = readFileSync(new URL("../../../../public/" + resource.assetPath, import.meta.url));
    return { ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function row(title: string) {
  const article = (await screen.findByText(title)).closest("article");
  if (!article) throw new Error("Missing audio row");
  return within(article);
}
it("plays inside the application without external links and filters categories", async () => {
  const view = render(<AudioResources category="sleep" />);
  const controls = await row("Happy Lullaby");
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByText("Children’s March Theme")).not.toBeInTheDocument();
  fireEvent.click(controls.getByRole("button", { name: "Play" }));
  await waitFor(() => expect(send).toHaveBeenLastCalledWith({ op: "play", id: "oga-happy-lullaby-song17" }));
  const registered = send.mock.calls[0][0].tracks[0];
  expect(registered.url).toMatch(/\/song17\.mp3$/);
  expect(registered.license).toBe("CC0-1.0");
  expect(registered.sha256).toBeUndefined();
  expect(send.mock.calls[1][0]).toEqual({ op: "cache", id: registered.id, data: expect.any(String), sha256: catalog.resources[0].sha256 });
  view.rerender(<AudioResources category="songs" />);
  await screen.findByText("Children’s March Theme");
  expect(screen.queryByText("Happy Lullaby")).not.toBeInTheDocument();
});
it("downloads through the existing cache instead of navigating or playing", async () => {
  render(<AudioResources category="sleep" />);
  const controls = await row("Happy Lullaby");
  fireEvent.click(controls.getByRole("button", { name: "Download" }));
  await waitFor(() => expect(send).toHaveBeenLastCalledWith({ op: "cache", id: "oga-happy-lullaby-song17", data: expect.any(String), sha256: catalog.resources[0].sha256 }));
  expect(send.mock.calls.some(([command]) => command.op === "play")).toBe(false);
});
it("does not play when library registration fails", async () => {
  send.mockResolvedValue(false);
  render(<AudioResources category="sleep" />);
  const controls = await row("Happy Lullaby");
  fireEvent.click(controls.getByRole("button", { name: "Play" }));
  await waitFor(() => expect(send).toHaveBeenCalledOnce());
  expect(send.mock.calls[0][0].op).toBe("catalog");
});
it("does not play when cache preparation fails", async () => {
  send.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  render(<AudioResources category="sleep" />);
  const controls = await row("Happy Lullaby");
  fireEvent.click(controls.getByRole("button", { name: "Play" }));
  await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(send.mock.calls.some(([command]) => command.op === "play")).toBe(false);
});
it("keeps the most recent play choice when registration resolves out of order", async () => {
  let finishFirst!: (value: boolean) => void;
  send.mockImplementationOnce(() => new Promise<boolean>(resolve => { finishFirst = resolve; }));
  render(<AudioResources category="sleep" />);
  const first = await row("Happy Lullaby"), second = await row("Calm Music");
  fireEvent.click(first.getByRole("button", { name: "Play" }));
  fireEvent.click(second.getByRole("button", { name: "Play" }));
  await waitFor(() => expect(send).toHaveBeenCalledWith({ op: "play", id: "oga-calm-music-morsi" }));
  finishFirst(true);
  await waitFor(() => expect(first.getByRole("button", { name: "Play" })).toBeEnabled());
  expect(send.mock.calls.filter(([command]) => command.op === "play").map(([command]) => command.id)).toEqual(["oga-calm-music-morsi"]);
});
it("allows retry after a failed local catalog request", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce({ ok: true, json: async () => catalog }));
  render(<AudioResources category="sleep" />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("Happy Lullaby");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
