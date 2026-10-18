import { z } from "zod";
import { defaultTypes, emptyWorkspace, workspaceSchema, type CareRecord, type Field, type RecordType } from "../domain/model";

const object = z.record(z.string(), z.json());
const envelope = z.object({
  manifest: z.object({ format: z.literal("calibaby-portable-backup"), version: z.literal(1), timeZoneIdentifier: z.string() }).catchall(z.json()),
  records: z.object({ babyProfiles: z.array(object), activeBabyId: z.string() }).catchall(z.json()),
});
const str = (v: unknown) => z.string().min(1).parse(v);
const num = (v: unknown) => z.number().finite().nonnegative().parse(v);
const field = (id: string, kind: Field["kind"], label: string, unit = ""): Field => ({ id, kind, label, unit, options: "" });
const extraTypes: RecordType[] = [
  { id: "cali-pump", name: "吸奶 / Pumping", icon: "bottle", description: "", fields: [field("amount", "measure", "总量 / Total", "mL"), field("left", "measure", "左侧 / Left", "mL"), field("right", "measure", "右侧 / Right", "mL"), field("duration", "timer", "时长 / Duration", "min")] },
  { id: "cali-temperature", name: "体温 / Temperature", icon: "plus", description: "", fields: [field("temperature", "measure", "体温 / Temperature", "°C")] },
  { id: "cali-sun", name: "晒太阳 / Sun exposure", icon: "leaf", description: "", fields: [field("duration", "timer", "时长 / Duration", "min")] },
];
const groups: Record<string, { type: string; time: string }> = {
  feedingRecords: { type: "feed", time: "startedAt" }, diaperRecords: { type: "diaper", time: "createdAt" },
  growthRecords: { type: "growth", time: "measuredAt" }, sleepRecords: { type: "sleep", time: "startedAt" },
  sunExposureRecords: { type: "cali-sun", time: "exposedAt" }, temperatureRecords: { type: "cali-temperature", time: "measuredAt" },
  vaccineRecords: { type: "vaccine", time: "administeredAt" }, bathRecords: { type: "bath", time: "createdAt" },
};
const labels: Record<string, string> = { milkSource: "奶源", location: "睡眠位置", color: "颜色", consistency: "性状", urineAmount: "尿量", poopAmount: "便量", method: "测量方式", context: "测量场景", doseLabel: "剂次", preventsLabel: "预防疾病", clinicName: "接种地点", manufacturer: "厂家", lotNumber: "批号", administrationSite: "接种部位" };
const words: Record<string, string> = { formula: "配方奶", breast_milk: "母乳", crib: "婴儿床", yellow: "黄色", soft: "软便", normal: "正常", armpit: "腋下", routine: "日常" };

export function parseCali(input: unknown) {
  const source = envelope.parse(input);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: source.manifest.timeZoneIdentifier, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const time = (value: unknown) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(num(value))).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  const result = emptyWorkspace();
  result.children = source.records.babyProfiles.map(p => ({ id: `cali:${str(p.id)}`, name: str(p.nickname), birthday: str(p.babyBirthDate), source: { format: "calibaby", data: { profile: p, manifest: source.manifest } } }));
  result.child = result.children.some(c => c.id === `cali:${source.records.activeBabyId}`) ? `cali:${source.records.activeBabyId}` : result.children[0]?.id ?? "";
  result.types = [...defaultTypes(), ...extraTypes];
  for (const [group, rows] of Object.entries(source.records)) {
    if (group === "babyProfiles" || group === "activeBabyId") continue;
    if (!Array.isArray(rows)) throw new Error(`Unsupported Cali data: ${group}`);
    if (!rows.length) continue;
    const mapping = groups[group];
    if (!mapping) throw new Error(`Unsupported Cali data: ${group}`);
    for (const entry of rows) {
      const r = object.parse(entry);
      const values: CareRecord["values"] = {};
      let type = mapping.type;
      let nursing: CareRecord["nursing"];
      const measure = (key: string, from: string, divisor = 1) => { if (r[from] != null) values[key] = num(r[from]) / divisor; };
      measure("duration", "duration", 60000);
      if (group === "feedingRecords") {
        const method = str(r.type);
        if (method.startsWith("pump")) { type = "cali-pump"; measure("left", "leftVolumeMl"); measure("right", "rightVolumeMl"); }
        else { values.method = z.enum(["breast", "bottle", "solids"]).parse(method) === "breast" ? "Nursing" : method === "bottle" ? "Bottle" : "Solids"; }
        measure("amount", "volumeMl");
        if (method === "breast") nursing = { startedAt: new Date(num(r.startedAt)).toISOString(), endedAt: new Date(num(r.endedAt)).toISOString(), leftSeconds: Math.floor(num(r.leftDurationMs ?? 0) / 1000), rightSeconds: Math.floor(num(r.rightDurationMs ?? 0) / 1000) };
      } else if (group === "diaperRecords") {
        const kinds = { wet: "Wet", dirty: "Dirty", mixed: "Mixed", dry: "Dry" };
        values.kind = kinds[z.enum(["wet", "dirty", "mixed", "dry"]).parse(r.type)]; values.times = 1;
      } else if (group === "growthRecords") { measure("weight", "weightKg"); measure("height", "heightCm"); }
      else if (group === "temperatureRecords") measure("temperature", "temperatureCelsius");
      else if (group === "vaccineRecords") { values.vaccine = str(r.vaccineName); values.date = time(r.administeredAt).slice(0, 10); }
      else if (group === "sleepRecords") {
        const pauses = z.array(z.object({ startedAt: z.number(), endedAt: z.number() })).parse(r.pauseIntervals ?? []);
        const paused = pauses.reduce((sum, p) => sum + num(p.endedAt - p.startedAt), 0);
        values.duration = num(num(r.endedAt) - num(r.startedAt) - paused) / 60000;
      }
      // Keep millisecond precision in source data; display minutes without long decimals.
      if (typeof values.duration === "number") values.duration = Math.round(values.duration * 1000) / 1000;
      const notes = [typeof r.note === "string" ? r.note : "", ...Object.entries(labels).flatMap(([key, label]) => r[key] == null ? [] : [`${label}：${words[String(r[key])] ?? String(r[key])}`])].filter(Boolean);
      const photos = z.array(z.string()).parse(r.notePhotoAttachments ?? []);
      if (typeof r.photoData === "string") photos.push(r.photoData);
      result.records.push({ id: `cali:${group}:${str(r.id)}`, child: `cali:${str(r.babyId)}`, type, time: time(r[mapping.time]), note: notes.join("\n"), values, nursing,
        photos: photos.map(value => `data:image/${value.startsWith("iVBOR") ? "png" : "jpeg"};base64,${value}`),
        source: { format: "calibaby", data: r },
      });
    }
  }
  const used = new Set(result.records.map(r => r.type));
  result.types = result.types.filter(t => !t.id.startsWith("cali-") || used.has(t.id));
  return workspaceSchema.parse(result);
}
