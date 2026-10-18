import { expect, it } from "vitest";
import { emptyWorkspace, type Workspace } from "../domain/model";
import { canonical, conflictKey, conflicts, materialize, mergeStates, resolveVersions, trackChanges, validateState, versionKey } from "./engine";
import { exportBackup, parseBackup } from "../backup/backup";
const a = "10000000-0000-4000-8000-000000000001", b = "10000000-0000-4000-8000-000000000002", c = "10000000-0000-4000-8000-000000000003";
function fixture(): Workspace {
  return { ...emptyWorkspace(), children: [{ id: "baby", name: "Baby", birthday: "2026-01-01" }], child: "baby", records: [{ id: "one", child: "baby", type: "feed", time: "2026-10-01T12:00", values: { amount: 120 }, note: "" }] };
}
function initial() { const data = fixture(); data.sync = trackChanges(null, data, a); return data; }
it("merges independent offline additions and converges in either order", () => {
  const base = initial(), left = structuredClone(base), right = structuredClone(base);
  left.records.push({ ...left.records[0], id: "left" });
  right.records.push({ ...right.records[0], id: "right" });
  const l = trackChanges(base, left, a), r = trackChanges(base, right, b);
  const merged = mergeStates(l, r);
  expect(canonical(merged)).toBe(canonical(mergeStates(r, l)));
  expect(materialize(base, merged).records.map(r => r.id).sort()).toEqual(["left", "one", "right"]);
  expect(canonical(mergeStates(merged, merged))).toBe(canonical(merged));
});
it("propagates deletion without resurrecting it when an old offline replica returns", () => {
  const base = initial(), deleted = { ...base, records: [] };
  const state = trackChanges(base, deleted, b);
  expect(materialize(base, mergeStates(state, base.sync!)).records).toHaveLength(0);
  const other = structuredClone(base); other.supplies.push({ id: "s", name: "Milk", stock: 1, low: 0, unit: "box" });
  const offline = trackChanges(base, other, c);
  expect(materialize(base, mergeStates(state, offline)).records).toHaveLength(0);
});
it("retains concurrent edit/delete and causally resolves the selected version", () => {
  const base = initial(), edited = structuredClone(base);
  edited.records[0].values.amount = 150;
  const merged = mergeStates(trackChanges(base, edited, a), trackChanges(base, { ...base, records: [] }, b));
  expect(conflicts(merged)).toHaveLength(1);
  expect(() => materialize(base, merged)).toThrow();
  const entry = conflicts(merged)[0];
  const state = resolveVersions(merged, { [conflictKey(entry)]: versionKey(entry.versions.find(v => v.value !== null)!) }, c);
  expect(materialize(base, mergeStates(state, merged)).records[0].values.amount).toBe(150);
});
it("three replicas converge across different merge orders", () => {
  const base = initial();
  const states = [a,b,c].map((actor,index) => {
    const data = structuredClone(base); data.records[0].note = `change ${index}`;
    return trackChanges(base,data,actor);
  });
  const left = mergeStates(mergeStates(states[0],states[1]),states[2]);
  const right = mergeStates(states[0],mergeStates(states[2],states[1]));
  expect(canonical(left)).toBe(canonical(right));
  expect(conflicts(left)[0].versions).toHaveLength(3);
});
it("blocks dependent-record inconsistencies rather than losing records", () => {
  const base = initial();
  const removed = { ...base, child: "", children: [], records: [] };
  const added = structuredClone(base); added.records.push({ ...added.records[0], id: "new" });
  const state = mergeStates(trackChanges(base,removed,a),trackChanges(base,added,b));
  expect(() => materialize(base,state)).toThrow();
});
it("does not synchronize device preferences or resume timers", () => {
  const base = initial(), other = structuredClone(base);
  other.session = { child: "baby", type: "sleep", time: "2026-10-01T12:00", started: 1, elapsed: 0 };
  expect(trackChanges(base,other,a)).toEqual(base.sync);
  expect(materialize(base,base.sync!).session).toBeNull();
});
it("rejects forged causal histories and same-dot different values", () => {
  const base = initial(); const invalid = structuredClone(base.sync!); invalid.clock = {};
  expect(() => validateState(invalid)).toThrow();
  const altered = structuredClone(base.sync!); altered.entries.find(e=>e.collection==="children")!.versions[0].value = { ...base.children[0], name:"Changed" };
  expect(() => mergeStates(base.sync!,altered)).toThrow("collision");
});
it("exports portable backups without device sync identity", () => {
  const base = initial(); base.syncOwner = "icloud:private-account";
  const text = exportBackup(base);
  expect(text).not.toContain("syncOwner"); expect(text).not.toContain(a);
  expect(parseBackup(text).records).toEqual(base.records);
});
