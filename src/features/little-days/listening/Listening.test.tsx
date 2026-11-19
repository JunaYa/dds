import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import catalog from "../../../../public/audio/catalog.json";
import { emptyState } from "~/audio/model";
import { ListeningHub, openListening, openPlayer } from "./Listening";
const state = { ...emptyState, playing: true, trackId: "selected", duration: 60, position: 1,
  tracks: [{ id: "selected", title: "Selected recording", artist: "Author", category: "sleep", url: "https://example.com/selected.mp3", license: "CC0-1.0", lyrics: "[00:00.00]First line" }] };
vi.mock("~/audio/AudioProvider", () => ({ useAudio: () => ({ state, send: vi.fn().mockResolvedValue(true) }) }));
vi.mock("../i18n/useI18n", () => ({ useI18n: () => ({ tr: (text: string) => text }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("renders playback controls and lyrics together without duplicate sibling keys or external links", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }));
  const errors = vi.spyOn(console, "error");
  render(<ListeningHub />);
  act(() => openPlayer());
  await screen.findByText("Now playing");
  expect(screen.getByRole("slider", { name: "Playback position" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "First line" })).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(errors.mock.calls.some(([message]) => String(message).includes("same key"))).toBe(false);
});

it("opens the global player before a track is selected and restores its entry on close", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }));
  const selected = state.trackId;
  state.trackId = "";
  try {
    render(<ListeningHub />);
    fireEvent.click(screen.getByRole("button", { name: "Open player" }));
    expect(await screen.findByRole("heading", { name: "Choose something to play." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open player" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(await screen.findByRole("button", { name: "Open player" })).toBeInTheDocument();
  } finally { state.trackId = selected; }
});
it("opens the unified player for the selected song from the global entry", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }));
  state.tracks[0].category = "songs";
  try {
    render(<ListeningHub />);
    fireEvent.click(screen.getByRole("button", { name: "Open player" }));
    expect(await screen.findByRole("heading", { name: "Player" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Playback position" })).toBeInTheDocument();
  } finally { state.tracks[0].category = "sleep"; }
});

it("keeps category browsing separate from playback controls and opens the player after selecting a track", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => catalog }));
  render(<ListeningHub />);
  act(() => openListening("sleep"));
  expect(await screen.findByRole("heading", { name: "Sleep sounds" })).toBeInTheDocument();
  expect(screen.queryByRole("slider", { name: "Playback position" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "First line" })).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Play" })[0]);
  expect(await screen.findByRole("heading", { name: "Player" })).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "Playback position" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Audio library" })).not.toBeInTheDocument();
});
