import { afterEach, expect, it, vi } from "vitest";
import catalog from "../../public/audio/pixabay-catalog.json";
import { loadPixabayCatalog, pixabayCatalogSchema } from "./pixabay-catalog";
import { catalogSchema } from "./model";

afterEach(() => vi.unstubAllGlobals());
it("keeps verified source references separate from playable tracks", () => {
  const parsed = pixabayCatalogSchema.parse(catalog);
  expect(parsed.resources.filter(item => item.category === "sleep")).toHaveLength(3);
  expect(parsed.resources.filter(item => item.category === "songs")).toHaveLength(3);
  expect(catalogSchema.safeParse(parsed.resources).success).toBe(false);
});
it("requests the bundled local JSON and forwards cancellation", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => catalog });
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  await expect(loadPixabayCatalog(controller.signal)).resolves.toEqual(catalog);
  expect(fetcher).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}audio/pixabay-catalog.json`, { signal: controller.signal });
});
it("rejects HTTP failures and invalid or duplicated source records", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  await expect(loadPixabayCatalog()).rejects.toThrow("404");
  expect(pixabayCatalogSchema.safeParse({ ...catalog, resources: [catalog.resources[0], catalog.resources[0]] }).success).toBe(false);
  expect(pixabayCatalogSchema.safeParse({ ...catalog, resources: [{ ...catalog.resources[0], sourcePage: "https://other.example/music" }] }).success).toBe(false);
});
