import { expect, it } from "vitest";
import { projectedPosition } from "./clock";
import { emptyState } from "./model";
it("projects native progress only while advancing and wraps at loop boundaries", () => {
  const state = { ...emptyState, position: 9.8, duration: 10, playing: true };
  expect(projectedPosition(state, 400)).toBeCloseTo(0.2);
  expect(projectedPosition({ ...state, repeat: false }, 400)).toBe(10);
  expect(projectedPosition({ ...state, buffering: true }, 400)).toBe(9.8);
  expect(projectedPosition({ ...state, playing: false }, 400)).toBe(9.8);
  expect(projectedPosition({ ...state, position: 0 }, 60_000)).toBe(2);
});
