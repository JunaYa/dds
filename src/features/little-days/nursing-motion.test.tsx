import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RollingTime, useNursingClock } from "./nursing-motion";
import { nursingSeconds } from "./nursing";
import type { Session } from "./model";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("keeps the readable time correct across a carry and a switch to a shorter timer", () => {
  const view = render(<RollingTime seconds={599} />);
  expect(screen.getByText("9:59")).toBeInTheDocument();
  view.rerender(<RollingTime seconds={600} />);
  expect(screen.getByText("10:00")).toBeInTheDocument();
  view.rerender(<RollingTime seconds={0} />);
  expect(screen.getByText("0:00")).toBeInTheDocument();
  expect(screen.queryByText("10:00")).not.toBeInTheDocument();
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
