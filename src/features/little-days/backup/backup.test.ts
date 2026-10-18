import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emptyWorkspace, summary } from "../domain/model";
import { exportBackup, mergeBackup, parseBackup } from "./backup";

const babyId = "test-baby";
const stamp = Date.UTC(2026, 9, 12, 16, 30);
function cali(records: Record<string, unknown> = {}) {
  return JSON.stringify({ manifest: { format: "calibaby-portable-backup", version: 1, timeZoneIdentifier: "Asia/Shanghai" }, records: { activeBabyId: babyId, babyProfiles: [{ id: babyId, nickname: "Test baby", babyBirthDate: "2026-09-01" }], ...records } });
}
const record = { id: "r", babyId, startedAt: stamp, endedAt: stamp + 60000 };
it("maps Cali milliseconds, source timezone, nursing sides, pump volumes and photos", () => {
  const data = parseBackup(cali({ feedingRecords: [
    { ...record, type: "breast", duration: 60000, leftDurationMs: 40001, rightDurationMs: 20000, notePhotoAttachments: ["/9j/AA=="] },
    { ...record, id: "pump", type: "pump_both", volumeMl: 80, leftVolumeMl: 50, rightVolumeMl: 30 },
  ] }));
  expect(data.records[0].time).toBe("2026-10-13T00:30");
  expect(data.records[0].values).toMatchObject({ method: "Nursing", duration: 1 });
  expect(data.records[0].nursing).toMatchObject({ leftSeconds: 40, rightSeconds: 20 });
  expect(data.records[0].photos).toEqual(["data:image/jpeg;base64,/9j/AA=="]);
  expect(data.records[1].type).toBe("cali-pump");
  expect(data.records[1].values).toMatchObject({ amount: 80, left: 50, right: 30 });
  expect(parseBackup(exportBackup(data))).toEqual(data);
});
it("merges without overwriting, deduplicates repeated imports and preserves active local timers", () => {
  const incoming = parseBackup(cali({ feedingRecords: [{ ...record, type: "bottle", volumeMl: 120 }] }));
  const current = mergeBackup(emptyWorkspace(), incoming).workspace;
  current.records[0].note = "edited locally";
  current.session = { child: current.child, type: "sleep", time: "2026-10-13T00:30", started: 10, elapsed: 0 };
  const merged = mergeBackup(current, incoming);
  expect(merged.added).toBe(0);
  expect(merged.skipped).toBe(1);
  expect(merged.workspace.records[0].note).toBe("edited locally");
  expect(merged.workspace.session).toEqual(current.session);
});
it("remaps conflicting custom types consistently without damaging existing fields", () => {
  const current = emptyWorkspace();
  current.types[0].fields = [{ id: "custom", kind: "text", label: "Custom", options: "", unit: "" }];
  const incoming = parseBackup(cali({ feedingRecords: [{ ...record, type: "bottle", volumeMl: 120 }] }));
  const merged = mergeBackup(current, incoming).workspace;
  expect(merged.records[0].type).toBe("feed-import-1");
  expect(mergeBackup(merged, incoming).workspace.types).toEqual(merged.types);
});
it("rejects corrupt, unsupported and orphan data before any import", () => {
  expect(() => parseBackup("broken")).toThrow();
  expect(() => parseBackup(cali({ unknownRecords: [record] }))).toThrow("Unsupported Cali data");
  expect(() => parseBackup(cali({ feedingRecords: [{ ...record, type: "bottle", babyId: "missing" }] }))).toThrow();
  expect(() => parseBackup(cali({ feedingRecords: [{ ...record, type: "bottle", volumeMl: -1 }] }))).toThrow();
  expect(() => parseBackup(cali().replace('"version":1', '"version":2'))).toThrow();
});
it("does not restart an imported timer", () => {
  const incoming = parseBackup(cali());
  incoming.session = { child: incoming.child, type: "sleep", time: "2026-10-13T00:30", started: 10, elapsed: 0 };
  expect(mergeBackup(emptyWorkspace(), incoming).workspace.session).toBeNull();
});
// Optional local compatibility check: personal backup contents never enter the repository.
it.skipIf(!process.env.CALI_BACKUP_PATH)("imports the supplied Cali export and round trips all 44 records", () => {
  const data = parseBackup(readFileSync(process.env.CALI_BACKUP_PATH!, "utf8"));
  expect(data.children).toHaveLength(1);
  expect(data.records).toHaveLength(44);
  expect(data.records.filter(r => r.photos?.length)).toHaveLength(2);
  for (const record of data.records) expect(summary(record, data.types.find(t => t.id === record.type)!)).not.toBe("Details recorded");
  expect(parseBackup(exportBackup(data))).toEqual(data);
  const first = mergeBackup(emptyWorkspace(), data).workspace;
  expect(mergeBackup(first, data).added).toBe(0);
});

import { planImport } from "./backup";
it("merges a shared baby into a selected existing profile and deduplicates repeat shares", () => {
  const incoming = parseBackup(cali({ feedingRecords: [{ ...record, type: "bottle", volumeMl: 100 }] }));
  const current = emptyWorkspace();
  current.children = [{ id: "local", name: "Local", birthday: "2026-09-01" }]; current.child = "local";
  const options = { mode: "merge" as const, targets: { [incoming.child]: "local" }, copyId: "copy" };
  const result = planImport(current, incoming, options);
  expect(result.workspace.children).toHaveLength(1);
  expect(result.workspace.records[0].child).toBe("local");
  expect(planImport(result.workspace, incoming, options).added).toBe(0);
});
it("replacement affects only selected children and keeps other families' records", () => {
  const incoming = parseBackup(cali({ feedingRecords: [{ ...record, type: "bottle", volumeMl: 100 }] }));
  const current = mergeBackup(emptyWorkspace(), incoming).workspace;
  current.children.push({ id: "other", name: "Other", birthday: "2026-09-01" });
  current.records.push({ ...current.records[0], id: "other-record", child: "other" });
  const result = planImport(current, incoming, { mode: "replace", targets: {}, copyId: "copy" });
  expect(result.replaced).toBe(1);
  expect(result.workspace.records).toHaveLength(2);
  expect(result.workspace.records.find(r => r.id === "other-record")).toEqual(current.records[1]);
});
it("new-profile mode creates independent record and child identities", () => {
  const incoming = parseBackup(cali({ feedingRecords: [{ ...record, type: "bottle", volumeMl: 100 }] }));
  const current = mergeBackup(emptyWorkspace(), incoming).workspace;
  const result = planImport(current, incoming, { mode: "new", targets: {}, copyId: "copy" });
  expect(result.workspace.children).toHaveLength(2);
  expect(result.workspace.records).toHaveLength(2);
  expect(result.workspace.child).not.toBe(current.child);
});
it("rejects stale or duplicate child targets", () => {
  const incoming = parseBackup(cali());
  expect(() => planImport(emptyWorkspace(), incoming, { mode: "merge", targets: { [incoming.child]: "missing" }, copyId: "copy" })).toThrow();
});
