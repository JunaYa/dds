import bundledCatalog from "./catalog-data.json";
import { z } from "zod";
import { trackSchema } from "./model";

export const audioResourceSchema = trackSchema.extend({
  url: trackSchema.shape.url.refine(value => /\.(mp3|m4a|aac|wav|caf|aiff|flac)$/i.test(new URL(value).pathname), "Expected audio file URL"),
  sourcePage: z.url().refine(value => new URL(value).protocol === "https:"),
  license: z.enum(["CC0-1.0", "Public domain"]),
  licensePage: z.url().refine(value => new URL(value).protocol === "https:"),
  provider: z.string().min(1).max(100),
  type: z.enum(["Lullaby", "Calm ambient", "Playful instrumental", "Children’s songs"]),
  durationSeconds: z.number().positive(),
  assetPath: z.string().regex(/^audio\/files\/[a-zA-Z0-9_-]+\.mp3$/),
  byteSize: z.number().int().positive().max(20 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export const audioCatalogSchema = z.object({
  version: z.literal(1),
  reviewedAt: z.iso.date(),
  resources: z.array(audioResourceSchema).min(1).max(500)
    .refine(items => new Set(items.map(item => item.id)).size === items.length, "Duplicate resource ID"),
});
export type AudioResource = z.infer<typeof audioResourceSchema>;
export type AudioCatalog = z.infer<typeof audioCatalogSchema>;

export async function loadAudioCatalog(signal?: AbortSignal): Promise<AudioCatalog> {
  signal?.throwIfAborted();
  return audioCatalogSchema.parse(bundledCatalog);
}

export async function bundledAudio(resource: AudioResource): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}${resource.assetPath}`);
  if (!response.ok) throw new Error(`Audio request failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== resource.byteSize || bytes.byteLength > 20 * 1024 * 1024) throw new Error("Bundled audio file is incomplete.");
  const chunks: string[] = [];
  for (let index = 0; index < bytes.length; index += 32768)
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 32768)));
  return btoa(chunks.join(""));
}
