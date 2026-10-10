import { expect, it } from "vitest";
import { nightStatus } from "./night-status";
import type { CareRecord, Session } from "../domain/model";
const at = (hour: number) => new Date(2026, 9, 10, hour);
const feed = (time: string, child = "baby"): CareRecord => ({ id: time + child, child, type: "feed", time, note: "", values: { method: "Bottle" } });
const feeds = ["2026-10-09T19:00", "2026-10-09T22:00", "2026-10-10T01:00", "2026-10-10T04:00"].map((time) => feed(time));
const session: Session = { child: "baby", type: "sleep", time: "2026-10-10T04:00", started: at(4).getTime(), elapsed: 0 };

it("moves through green, yellow and red using milk feeding intervals", () => {
  expect(nightStatus(feeds, null, "baby", at(5)).feed).toMatchObject({ typical: 180, samples: 3, signal: "green", elapsed: 60 });
  expect(nightStatus(feeds, null, "baby", new Date(2026, 9, 10, 6, 30)).signal).toBe("yellow");
  expect(nightStatus(feeds, null, "baby", at(7)).signal).toBe("red");
});
it("does not infer sleep from completed records and ignores other children and future entries", () => {
  const records = [...feeds.map((r) => ({ ...r, child: "other" })), feed("2026-10-10T23:00")];
  expect(nightStatus(records, null, "baby", at(5))).toMatchObject({ signal: "neutral", sleep: { elapsed: null }, feed: { elapsed: null } });
});
it("suppresses estimates for sparse, inconsistent, stale, or non-milk feeding history", () => {
  expect(nightStatus(feeds.slice(1), null, "baby", at(5)).signal).toBe("neutral");
  expect(nightStatus([...feeds, feed("2026-10-10T04:10")], null, "baby", at(5)).signal).toBe("neutral");
  expect(nightStatus(feeds, null, "baby", new Date(2026, 9, 11, 5)).signal).toBe("neutral");
  expect(nightStatus([...feeds, { ...feed("2026-10-10T04:30"), values: { method: "Solids" } }], null, "baby", at(5)).signal).toBe("neutral");
});
it("uses comparable completed sleep durations and suppresses paused timers", () => {
  const sleeps: CareRecord[] = [7, 8, 9].map((day) => ({ id: String(day), child: "baby", type: "sleep", time: `2026-10-${String(day).padStart(2, "0")}T22:00`, note: "", values: { duration: 120 } }));
  expect(nightStatus(sleeps, session, "baby", at(5)).sleep).toMatchObject({ elapsed: 60, typical: 120, signal: "green" });
  expect(nightStatus(sleeps, session, "baby", at(6)).signal).toBe("red");
  expect(nightStatus(sleeps, { ...session, started: null, elapsed: 3600 }, "baby", at(6)).sleep).toMatchObject({ elapsed: 60, paused: true, signal: "neutral" });
  expect(nightStatus(sleeps, { ...session, child: "other" }, "baby", at(6)).sleep.elapsed).toBeNull();
});
it("does not estimate feeding while a feeding timer is active", () => {
  expect(nightStatus(feeds, { ...session, type: "feed" }, "baby", at(7)).feed.signal).toBe("neutral");
});
