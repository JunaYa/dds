import { z } from "zod";

const pixabayPage = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "pixabay.com";
});
export const pixabayCatalogSchema = z.object({
  version: z.literal(1),
  reviewedAt: z.iso.date(),
  provider: z.literal("Pixabay"),
  searchPage: pixabayPage,
  licensePage: pixabayPage,
  resources: z.array(z.object({
    id: z.string().regex(/^pixabay-\d+$/),
    title: z.string().min(1),
    artist: z.string().min(1),
    category: z.enum(["sleep", "songs"]),
    type: z.enum(["Lullaby", "Calm ambient", "Playful instrumental", "Children’s songs"]),
    durationSeconds: z.number().int().positive(),
    sourcePage: pixabayPage,
    availability: z.literal("source-only"),
    aiGenerated: z.boolean().nullable(),
  })).max(500).refine(items => new Set(items.map(item => item.id)).size === items.length, "Duplicate resource ID"),
});
export type PixabayCatalog = z.infer<typeof pixabayCatalogSchema>;

export async function loadPixabayCatalog(signal?: AbortSignal): Promise<PixabayCatalog> {
  const response = await fetch(`${import.meta.env.BASE_URL}audio/pixabay-catalog.json`, { signal });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  return pixabayCatalogSchema.parse(await response.json());
}
