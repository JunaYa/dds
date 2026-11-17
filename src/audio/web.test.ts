import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WebAudioBackend } from "./web";
class TestAudio extends EventTarget {
  src = ""; currentTime = 0; duration = 120; loop = false;
  play = vi.fn(async () => { this.dispatchEvent(new Event("playing")); });
  pause = vi.fn(() => { this.dispatchEvent(new Event("pause")); });
}
let audio: TestAudio;
const track = { id: "moon", title: "Moon", artist: "Author", category: "sleep" as const,
  url: "https://example.com/moon.mp3", license: "Permission", lyrics: "" };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); localStorage.clear();
  vi.stubGlobal("Audio", class { constructor() { audio = new TestAudio(); return audio; } });
  vi.stubGlobal("URL", class extends URL { static createObjectURL = () => "blob:cached"; static revokeObjectURL = vi.fn(); });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it("stops on a deadline and cancels a timer when another track is selected", async () => {
  const backend = new WebAudioBackend();
  await backend.execute({ op: "catalog", tracks: [track, { ...track, id: "stars" }] });
  await backend.execute({ op: "play", id: "moon" });
  await backend.execute({ op: "timer", minutes: 15 });
  vi.setSystemTime(Date.now() + 15 * 60_000);
  expect((await backend.snapshot()).playing).toBe(false);
  expect((await backend.snapshot()).deadline).toBeNull();
  await backend.execute({ op: "play" });
  await backend.execute({ op: "timer", minutes: 15 });
  await backend.execute({ op: "play", id: "stars" });
  expect((await backend.snapshot()).deadline).toBeNull();
});
it("does not block pause behind an in-flight download and plays the saved file offline", async () => {
  const backend = new WebAudioBackend();
  await backend.execute({ op: "catalog", tracks: [track] });
  let complete!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { complete = resolve; })));
  const downloading = backend.execute({ op: "download", id: "moon" });
  expect((await backend.snapshot()).downloading).toEqual(["moon"]);
  await backend.execute({ op: "pause" });
  expect(audio.pause).toHaveBeenCalled();
  complete(new Response(new Blob(["audio"], { type: "audio/mpeg" })));
  await downloading;
  expect((await backend.snapshot()).downloaded).toContain("moon");
  await backend.execute({ op: "play", id: "moon" });
  expect(audio.src).toBe("blob:cached");
});
it("preserves the catalog when an update changes a stable source ID", async () => {
  const backend = new WebAudioBackend();
  await backend.execute({ op: "catalog", tracks: [track] });
  await expect(backend.execute({ op: "catalog", tracks: [{ ...track, url: "https://example.com/new.mp3" }] })).rejects.toThrow("new track ID");
  expect((await backend.snapshot()).tracks[0].url).toBe(track.url);
});
