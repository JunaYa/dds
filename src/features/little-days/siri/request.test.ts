import { expect, it } from "vitest";
import { defaultTypes, localDateTime } from "../domain/model";
import { siriDraft, siriRequestSchema } from "./request";

const base = { id: "d50f468e-05ba-43cf-aaf8-1bb674b563fc", time: "2026-10-26T01:12:00Z" };
it("validates Siri parameters before prefilling a local-time draft", () => {
  const item = siriRequestSchema.parse({ ...base, kind: "feed", amount: 120 });
  const draft = siriDraft(item, defaultTypes()[0]);
  expect(draft).toEqual({ values: { method: "Bottle", amount: 120 },
    time: localDateTime(new Date(base.time)), source: { format: "siri", data: { requestId: base.id } } });
  for (const amount of [0, -1, 2001, Infinity, "120"]) {
    expect(siriRequestSchema.safeParse({ ...base, kind: "feed", amount }).success).toBe(false);
  }
  expect(siriRequestSchema.safeParse({ ...base, kind: "diaper", diaper: "unknown" }).success).toBe(false);
  expect(siriRequestSchema.safeParse({ ...base, time: "bad", kind: "feed", amount: 120 }).success).toBe(false);
});
it("does not interpret changed units or custom choices as built-in fields", () => {
  const item = siriRequestSchema.parse({ ...base, kind: "feed", amount: 120 });
  const type = defaultTypes()[0];
  type.fields.find(f => f.id === "amount")!.unit = "oz";
  expect(siriDraft(item, type)).toBeNull();
  const diaper = defaultTypes().find(t => t.id === "diaper")!;
  expect(siriDraft(siriRequestSchema.parse({ ...base, kind: "diaper", diaper: "Mixed" }), diaper)?.values).toEqual({ kind: "Mixed" });
  diaper.fields.find(f => f.id === "kind")!.options = "Custom";
  expect(siriDraft(siriRequestSchema.parse({ ...base, kind: "diaper", diaper: "Mixed" }), diaper)).toBeNull();
});
