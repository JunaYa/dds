import { describe, expect, it } from "vitest";
import { activeCue, parseLyrics } from "./lyrics";
import { catalogSchema } from "./model";
describe("synchronized lyrics", () => {
  it("normalizes offsets, multiple timestamps and ordering", () => {
    expect(parseLyrics("[offset:-500]\n[00:02.00][00:04.00]月亮\n[00:00.20]星星")).toEqual([
      { start: 0, text: "星星" }, { start: 1.5, text: "月亮" }, { start: 3.5, text: "月亮" },
    ]);
  });
  it("honors WebVTT end boundaries and gaps after seeks", () => {
    const cues = parseLyrics("WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000 align:start\nHello\nworld\n\n00:03.000 --> 00:04.000\nMoon");
    expect(activeCue(cues, 0)).toBe(-1);
    expect(activeCue(cues, 1)).toBe(0);
    expect(activeCue(cues, 2.5)).toBe(-1);
    expect(activeCue(cues, 3.5)).toBe(1);
    expect(activeCue(cues, 4)).toBe(-1);
    expect(cues[0].text).toBe("Hello\nworld");
  });
  it("ignores untimed and malformed text", () => {
    expect(parseLyrics("[ar:someone]\n[99]bad\nplain text")).toEqual([]);
    expect(activeCue([], 10)).toBe(-1);
  });
});
it("rejects unsafe IDs, insecure sources and duplicate catalog entries", () => {
  const track = { id: "song-1", title: "Song", category: "songs", url: "https://example.com/song.mp3", license: "Author permission" };
  expect(catalogSchema.parse([track])[0].lyrics).toBe("");
  expect(catalogSchema.safeParse([track, track]).success).toBe(false);
  expect(catalogSchema.safeParse([{ ...track, id: "../escape" }]).success).toBe(false);
  expect(catalogSchema.safeParse([{ ...track, url: "file:///private/file" }]).success).toBe(false);
});
