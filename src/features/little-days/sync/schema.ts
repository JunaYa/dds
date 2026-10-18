import { z } from "zod";
const device = z.string().uuid();
export const syncStateSchema = z.object({
  version: z.literal(1),
  clock: z.record(device, z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)),
  entries: z.array(z.object({
    collection: z.enum(["children", "types", "records", "supplies"]),
    id: z.string().min(1),
    versions: z.array(z.object({ device, sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), value: z.json() })).min(1),
  })).max(100000),
});
export type SyncState = z.infer<typeof syncStateSchema>;
export type Collection = SyncState["entries"][number]["collection"];
export type Version = SyncState["entries"][number]["versions"][number];
