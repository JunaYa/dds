import { describe, expect, it } from "vitest";
import {
  elapsedSeconds,
  finishTimer,
  newTask,
  nextOccurrence,
  saveDraft,
  toggleDone,
  toggleTimer,
} from "./model";

describe("collage execution", () => {
  it("restores elapsed time from a timestamp and stops at the target", () => {
    const task = {
      ...newTask(),
      blocks: ["timer" as const],
      timer: 1,
      elapsed: 10,
      started: 1000,
    };
    expect(elapsedSeconds(task, 21000)).toBe(30);
    expect(finishTimer(task, 61000)).toMatchObject({
      started: null,
      elapsed: 60,
    });
    expect(elapsedSeconds(task, 0)).toBe(10);
  });
  it("pauses, resumes and restarts finished timers without losing accumulated time", () => {
    const task = { ...newTask(), blocks: ["timer" as const], timer: 1 };
    const running = toggleTimer(task, 1000);
    const paused = toggleTimer(running, 11000);
    expect(paused).toMatchObject({ elapsed: 10, started: null });
    expect(toggleTimer(paused, 21000)).toMatchObject({
      elapsed: 10,
      started: 21000,
    });
    expect(toggleTimer({ ...task, elapsed: 60 }, 21000)).toMatchObject({
      elapsed: 0,
      started: 21000,
    });
  });
  it("completion freezes time and the next recurring occurrence resets execution", () => {
    const task = {
      ...newTask(),
      blocks: ["timer" as const, "repeat" as const],
      elapsed: 10,
      started: 1000,
      value: 3,
    };
    const done = toggleDone(task, 5000);
    expect(done).toMatchObject({ done: true, started: null, elapsed: 14 });
    expect(toggleTimer(done, 10000)).toBe(done);
    expect(nextOccurrence(done)).toMatchObject({
      done: false,
      started: null,
      elapsed: 0,
      value: 0,
    });
    expect(nextOccurrence(task)).toBe(task);
  });
  it("editing a running timer safely pauses and clamps its new target", () => {
    const task = {
      ...newTask(),
      title: " 喝水 ",
      timer: 1,
      count: 2,
      value: 5,
      elapsed: 20,
      started: 1000,
    };
    expect(saveDraft(task, 61000)).toMatchObject({
      title: "喝水",
      elapsed: 60,
      value: 2,
      started: null,
    });
  });
});
