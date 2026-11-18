import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import catalog from "../../../../public/audio/catalog.json";
import { emptyState } from "~/audio/model";
import { ListeningHub, openListening } from "./Listening";
const state = { ...emptyState, playing: true, trackId: "selected", duration: 60, position: 1,
  tracks: [{ id: "selected", title: "Selected recording", artist: "Author", category: "sleep", url: "https://example.com/selected.mp3", license: "CC0-1.0", lyrics: "[00:00.00]First line" }] };
vi.mock("~/audio/AudioProvider", () => ({ useAudio: () => ({ state, send: vi.fn().mockResolvedValue(true) }) }));
vi.mock("../i18n/useI18n", () => ({ useI18n: () => ({ tr: (text: string) => text }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("renders playback controls and lyrics together without duplicate sibling keys or external links", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }));
  const errors = vi.spyOn(console, "error");
  render(<ListeningHub />);
  act(() => openListening("sleep"));
  await screen.findByText("Now playing");
  expect(screen.getByRole("slider", { name: "Playback position" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "First line" })).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(errors.mock.calls.some(([message]) => String(message).includes("same key"))).toBe(false);
});
