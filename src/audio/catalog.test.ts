import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import catalog from "../../public/audio/catalog.json";
import { audioCatalogSchema, bundledAudio, loadAudioCatalog } from "./catalog";
import { trackSchema } from "./model";
afterEach(() => vi.unstubAllGlobals());
it("ships directly playable, licensed audio in both categories", () => {
  const parsed = audioCatalogSchema.parse(catalog);
  expect(new Set(parsed.resources.map(item => item.category))).toEqual(new Set(["sleep", "songs"]));
  for (const resource of parsed.resources) {
    expect(trackSchema.safeParse(resource).success).toBe(true);
    expect(new URL(resource.url).pathname).toMatch(/\.mp3$/i);
    expect(resource.url).not.toBe(resource.sourcePage);
    expect(resource.license).toBe("CC0-1.0");
    const bytes = readFileSync(new URL("../../public/" + resource.assetPath, import.meta.url));
    expect(bytes.byteLength).toBe(resource.byteSize);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(resource.sha256);
  }
});
it("loads the local JSON and rejects duplicate IDs or source pages as audio", async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => catalog }).mockResolvedValueOnce({ ok: false, status: 404 });
  vi.stubGlobal("fetch", fetch);
  expect(await loadAudioCatalog()).toEqual(audioCatalogSchema.parse(catalog));
  expect(fetch.mock.calls[0][0]).toBe("/audio/catalog.json");
  await expect(loadAudioCatalog()).rejects.toThrow("404");
  const first = catalog.resources[0];
  expect(audioCatalogSchema.safeParse({ ...catalog, resources: [first, first] }).success).toBe(false);
  expect(audioCatalogSchema.safeParse({ ...catalog, resources: [{ ...first, url: first.sourcePage }] }).success).toBe(false);
  expect(audioCatalogSchema.safeParse({ ...catalog, resources: [{ ...first, license: "Unknown" }] }).success).toBe(false);
  expect(audioCatalogSchema.safeParse({ ...catalog, resources: [{ ...first, url: "http://example.com/audio.mp3" }] }).success).toBe(false);
});

it("prepares the packaged file and rejects incomplete copies", async () => {
  const resource = audioCatalogSchema.parse(catalog).resources[0];
  const bytes = readFileSync(new URL("../../public/" + resource.assetPath, import.meta.url));
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer })
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
  vi.stubGlobal("fetch", fetch);
  expect(Buffer.from(await bundledAudio(resource), "base64")).toEqual(bytes);
  expect(fetch.mock.calls[0][0]).toBe("/" + resource.assetPath);
  await expect(bundledAudio(resource)).rejects.toThrow("incomplete");
});
