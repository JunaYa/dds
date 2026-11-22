import { z } from "zod";

export const trackSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  title: z.string().trim().min(1).max(200),
  artist: z.string().max(200).default(""),
  category: z.enum(["sleep", "songs"]),
  url: z.url().refine(value => new URL(value).protocol === "https:", "HTTPS required"),
  artwork: z.union([
    z.url().refine(value => value.startsWith("https:"), "HTTPS required"),
    z.string().regex(/^audio\/artwork\/[a-zA-Z0-9_-]+\.svg$/),
  ]).optional(),
  sourcePage: z.url().refine(value => new URL(value).protocol === "https:").optional(),
  license: z.string().trim().min(1).max(500),
  lyrics: z.string().max(500_000).default(""),
});
export type Track = z.infer<typeof trackSchema>;
export const catalogSchema = z.array(trackSchema).max(500).superRefine((tracks, ctx) => {
  if (new Set(tracks.map(track => track.id)).size !== tracks.length)
    ctx.addIssue({ code: "custom", message: "Duplicate track ID" });
});
export type AudioState = {
  systemControls?: boolean;
  tracks: Track[];
  trackId: string | null;
  playing: boolean;
  buffering: boolean;
  position: number;
  duration: number;
  repeat: boolean;
  deadline: number | null;
  downloaded: string[];
  downloading: string[];
  error: string | null;
};
export const emptyState: AudioState = {
  tracks: [], trackId: null, playing: false, buffering: false, position: 0,
  duration: 0, repeat: true, deadline: null, downloaded: [], downloading: [], error: null,
};
export type AudioCommand =
  | { op: "catalog"; tracks: Track[] }
  | { op: "play"; id?: string }
  | { op: "pause" | "stop" }
  | { op: "seek"; position: number }
  | { op: "repeat"; enabled: boolean }
  | { op: "timer"; minutes: number }
  | { op: "download" | "removeDownload"; id: string }
  | { op: "cache"; id: string; data: string; sha256: string };
export interface AudioBackend {
  snapshot(): Promise<AudioState>;
  execute(command: AudioCommand): Promise<AudioState>;
}
