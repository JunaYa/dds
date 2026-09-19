import { expect, it } from "vitest";
import { sessionSchema, type Session } from "./model";
import {
  formatNursingTime,
  nursingSeconds,
  pauseOrResumeSession,
  switchNursingSide,
} from "./nursing";

function session(): Session {
  return {
    type: "feed",
    child: "baby",
    time: "2026-09-19T18:28",
    started: 1000,
    elapsed: 0,
    nursing: {
      side: "left",
      left: 0,
      right: 0,
      startedAt: "2026-09-19T10:28:00.000Z",
    },
  };
}

it("accounts for both sides across switches without losing partial seconds", () => {
  const right = switchNursingSide(session(), "right", 62500);
  expect(nursingSeconds(right, 83750)).toEqual({ left: 61.5, right: 21.25 });
  const left = switchNursingSide(right, "left", 83750);
  expect(nursingSeconds(left, 105000)).toEqual({ left: 82.75, right: 21.25 });
  expect(switchNursingSide(left, "left", 106000)).toBe(left);
});

it("excludes paused time, including switching sides while paused", () => {
  const paused = pauseOrResumeSession(session(), 11000);
  const switched = switchNursingSide(paused, "right", 99000);
  expect(switched.started).toBeNull();
  expect(nursingSeconds(switched, 100000)).toEqual({ left: 10, right: 0 });
  const resumed = pauseOrResumeSession(switched, 100000);
  expect(nursingSeconds(resumed, 105000)).toEqual({ left: 10, right: 5 });
});

it("restores a background timer from timestamps and tolerates a clock moving backward", () => {
  const restored = sessionSchema.parse(JSON.parse(JSON.stringify(session())));
  expect(nursingSeconds(restored, 3601000)).toEqual({ left: 3600, right: 0 });
  expect(nursingSeconds(restored, 0)).toEqual({ left: 0, right: 0 });
  expect(formatNursingTime(466.9)).toBe("7:46");
  expect(formatNursingTime(6001)).toBe("100:01");
});

it("preserves existing generic timers", () => {
  const { nursing: _, ...legacy } = session();
  expect(sessionSchema.parse(legacy)).toEqual(legacy);
  expect(pauseOrResumeSession(legacy, 11000)).toMatchObject({
    elapsed: 10,
    started: null,
  });
});
