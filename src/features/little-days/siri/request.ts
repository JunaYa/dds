import { z } from "zod";
import { localDateTime, type CareRecord, type RecordType } from "../domain/model";

export const siriRequestSchema = z.object({
  id: z.uuid(),
  time: z.iso.datetime({ offset: true }),
}).and(z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("feed"), amount: z.number().finite().positive().max(2000) }),
  z.object({ kind: z.literal("diaper"), diaper: z.enum(["Wet", "Dirty", "Mixed", "Dry"]) }),
]));
export type SiriRequest = z.infer<typeof siriRequestSchema>;

export function siriDraft(request: SiriRequest, type: RecordType): Pick<CareRecord, "values" | "time" | "source"> | null {
  if (type.id !== request.kind) return null;
  const choice = type.fields.find(f => f.id === (request.kind === "feed" ? "method" : "kind") && f.kind === "choice");
  const option = request.kind === "feed" ? "Bottle" : request.diaper;
  if (!choice?.options.split(",").map(v => v.trim()).includes(option)) return null;
  if (request.kind === "feed" && !type.fields.some(f => f.id === "amount" && f.kind === "measure" && f.unit === "mL")) return null;
  return {
    values: request.kind === "feed" ? { method: "Bottle", amount: request.amount } : { kind: request.diaper },
    time: localDateTime(new Date(request.time)),
    source: { format: "siri", data: { requestId: request.id } },
  };
}
