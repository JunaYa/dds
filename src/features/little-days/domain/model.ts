import { z } from "zod";

const id = z.string().min(1);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)));
const time = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)));
export const fieldSchema = z
  .object({
    id,
    kind: z.enum(["timer", "count", "measure", "choice", "text", "date"]),
    label: z.string().trim().min(1),
    unit: z.string().default(""),
    options: z.string().default(""),
  })
  .refine(
    (f) => f.kind !== "choice" || f.options.split(",").some((v) => v.trim()),
  );
export const typeSchema = z.object({
  id,
  name: z.string().trim().min(1),
  icon: z.string(),
  description: z.string(),
  fields: z.array(fieldSchema).min(1),
});
export const recordSchema = z.object({
  id,
  child: id,
  type: id,
  time,
  note: z.string(),
  nursing: z
    .object({
      startedAt: z.iso.datetime(),
      endedAt: z.iso.datetime(),
      leftSeconds: z.number().finite().nonnegative(),
      rightSeconds: z.number().finite().nonnegative(),
    })
    .optional(),
  values: z.record(
    z.string(),
    z.union([z.string(), z.number().finite().nonnegative()]),
  ),
});
export const childSchema = z.object({
  id,
  name: z.string().trim().min(1),
  birthday: date,
});
export const supplySchema = z.object({
  id,
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  stock: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
});
export const sessionSchema = z.object({
  child: id,
  type: id,
  time,
  started: z.number().finite().nonnegative().nullable(),
  elapsed: z.number().finite().nonnegative(),
  nursing: z
    .object({
      side: z.enum(["left", "right"]),
      startedAt: z.iso.datetime(),
      left: z.number().finite().nonnegative(),
      right: z.number().finite().nonnegative(),
    })
    .optional(),
});
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    children: z.array(childSchema),
    child: z.string(),
    types: z.array(typeSchema).min(1),
    records: z.array(recordSchema),
    supplies: z.array(supplySchema),
    session: sessionSchema.nullable(),
  })
  .superRefine((data, ctx) => {
    const issue = () =>
      ctx.addIssue({
        code: "custom",
        message: "Invalid workspace references or duplicate identifiers.",
      });
    const unique = (items: { id: string }[]) =>
      new Set(items.map((item) => item.id)).size === items.length;
    if (
      ![data.children, data.types, data.records, data.supplies].every(unique) ||
      data.types.some((t) => !unique(t.fields))
    )
      issue();
    if (
      data.children.length
        ? !data.children.some((c) => c.id === data.child)
        : data.child !== ""
    )
      issue();
    for (const r of data.records) {
      const type = data.types.find((t) => t.id === r.type);
      if (!type || !data.children.some((c) => c.id === r.child)) {
        issue();
        continue;
      }
      for (const [key, value] of Object.entries(r.values)) {
        const field = type.fields.find((f) => f.id === key);
        if (!field) {
          issue();
          continue;
        }
        if (value === "") continue;
        if (
          ["timer", "count", "measure"].includes(field.kind) &&
          (typeof value !== "number" ||
            (field.kind === "count" && !Number.isInteger(value)))
        )
          issue();
        if (
          ["text", "choice", "date"].includes(field.kind) &&
          typeof value !== "string"
        )
          issue();
        if (
          field.kind === "choice" &&
          !field.options
            .split(",")
            .map((v) => v.trim())
            .includes(String(value))
        )
          issue();
        if (field.kind === "date" && !date.safeParse(value).success) issue();
      }
    }
    if (
      data.session &&
      (!data.children.some((c) => c.id === data.session?.child) ||
        !data.types.some(
          (t) =>
            t.id === data.session?.type &&
            t.fields.some((f) => f.kind === "timer"),
        ))
    )
      issue();
  });
export type Field = z.infer<typeof fieldSchema>;
export type RecordType = z.infer<typeof typeSchema>;
export type CareRecord = z.infer<typeof recordSchema>;
export type Child = z.infer<typeof childSchema>;
export type Supply = z.infer<typeof supplySchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Values = CareRecord["values"];

export function localDateTime(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
export const today = () => localDateTime().slice(0, 10);
export function age(birthday: string, now = new Date()) {
  const born = new Date(`${birthday}T00:00`);
  const months = Math.max(
    0,
    (now.getFullYear() - born.getFullYear()) * 12 +
      now.getMonth() -
      born.getMonth() -
      (now.getDate() < born.getDate() ? 1 : 0),
  );
  return months < 12
    ? `${months} months`
    : `${Math.floor(months / 12)} years${months % 12 ? `, ${months % 12} months` : ""}`;
}
export function elapsedSeconds(
  session: Pick<Session, "started" | "elapsed">,
  now = Date.now(),
) {
  return (
    session.elapsed +
    (session.started === null
      ? 0
      : Math.max(0, Math.floor((now - session.started) / 1000)))
  );
}
export const formatTimer = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export const field = (
  kind: Field["kind"],
  label: string,
  unit = "",
  options = "",
): Field => ({ id: crypto.randomUUID(), kind, label, unit, options });
export const kinds: Record<Field["kind"], string> = {
  timer: "Timer",
  count: "Counter",
  measure: "Measurement",
  choice: "Choice",
  text: "Notes",
  date: "Date",
};
export function summary(record: CareRecord, type: RecordType) {
  const details =
    type.fields
      .filter(
        (f) => record.values[f.id] !== undefined && record.values[f.id] !== "",
      )
      .map(
        (f) =>
          `${record.values[f.id]}${f.kind === "timer" ? " min" : f.unit ? " " + f.unit : ""}`,
      )
      .join(" · ") || "Details recorded";
  return record.nursing
    ? `${details} · 左 ${formatTimer(record.nursing.leftSeconds)} · 右 ${formatTimer(record.nursing.rightSeconds)}`
    : details;
}
export function defaultTypes(): RecordType[] {
  const f = (
    id: string,
    kind: Field["kind"],
    label: string,
    unit = "",
    options = "",
  ): Field => ({ id, kind, label, unit, options });
  const notes = f("note", "text", "Notes");
  const duration = f("duration", "timer", "Duration", "min");
  return [
    {
      id: "feed",
      name: "Feeding",
      icon: "bottle",
      description: "Bottle, nursing, or solids.",
      fields: [
        f("method", "choice", "Method", "", "Bottle, Nursing, Solids"),
        f("amount", "measure", "Amount", "mL"),
        duration,
        notes,
      ],
    },
    {
      id: "diaper",
      name: "Diaper",
      icon: "drop",
      description: "Wet, dirty, and everything in between.",
      fields: [
        f("kind", "choice", "Type", "", "Wet, Dirty, Mixed, Dry"),
        f("times", "count", "Changes", "changes"),
        notes,
      ],
    },
    {
      id: "sleep",
      name: "Sleep",
      icon: "moon",
      description: "Little naps and longer nights.",
      fields: [
        duration,
        f("kind", "choice", "Kind", "", "Nap, Night sleep"),
        notes,
      ],
    },
    {
      id: "bath",
      name: "Bath",
      icon: "bath",
      description: "A fresh start or a gentle wind-down.",
      fields: [duration, notes],
    },
    {
      id: "vaccine",
      name: "Vaccination",
      icon: "plus",
      description: "Keep details from your care provider.",
      fields: [
        f("vaccine", "text", "Vaccine name"),
        f("date", "date", "Date given"),
        f("note", "text", "Clinic / batch / notes"),
      ],
    },
    {
      id: "growth",
      name: "Growth",
      icon: "ruler",
      description: "Their latest measurements.",
      fields: [
        f("weight", "measure", "Weight", "kg"),
        f("height", "measure", "Height", "cm"),
      ],
    },
    {
      id: "vitamin",
      name: "Vitamins",
      icon: "leaf",
      description: "Record what was given.",
      fields: [
        f("name", "text", "Product name"),
        f("quantity", "measure", "Amount given", "drops"),
        notes,
      ],
    },
  ];
}
export function emptyWorkspace(): Workspace {
  return {
    version: 1,
    children: [],
    child: "",
    types: defaultTypes(),
    records: [],
    supplies: [],
    session: null,
  };
}
