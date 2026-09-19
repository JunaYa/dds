import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useNursingClock } from "./useNursingClock";
import { nursingSeconds } from "../domain/nursing";
import { type Session } from "../domain/model";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("stops ticking when hidden and catches up from timestamps when shown again", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const session: Session = {
    child: "baby",
    type: "feed",
    time: "2026-09-19T18:28",
    elapsed: 0,
    started: 1000,
    nursing: {
      startedAt: "2026-09-19T10:28:00Z",
      left: 0,
      right: 0,
      side: "left",
    },
  };
  const hook = renderHook(({ visible }) => useNursingClock(session, visible), {
    initialProps: { visible: true },
  });
  act(() => vi.advanceTimersByTime(1000));
  expect(hook.result.current).toBe(2000);
  hidden.mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => vi.advanceTimersByTime(60000));
  expect(hook.result.current).toBe(2000);
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(nursingSeconds(session, hook.result.current).left).toBe(61);
  hook.rerender({ visible: false });
  act(() => vi.advanceTimersByTime(1000));
  expect(hook.result.current).toBe(62000);
  hook.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
