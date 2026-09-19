import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ElapsedTime } from './feeding-timer';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('catches up from timestamps after backgrounding and keeps the end time fixed', () => {
  vi.useFakeTimers();
  const start = new Date('2026-09-18T23:59:30+08:00');
  vi.setSystemTime(start);
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const view = render(<ElapsedTime startedAt={start.toISOString()} />);
  act(() => vi.advanceTimersByTime(2500));
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:02');
  hidden.mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  const end = new Date(start.getTime() + 3_725_000);
  vi.setSystemTime(end);
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(screen.getByRole('timer')).toHaveTextContent('01:02:05');
  view.rerender(<ElapsedTime startedAt={start.toISOString()} endedAt={end.toISOString()} />);
  act(() => vi.advanceTimersByTime(60_000));
  expect(screen.getByRole('timer')).toHaveTextContent('01:02:05');
  view.rerender(<ElapsedTime startedAt={start.toISOString()} endedAt="" />);
  act(() => vi.advanceTimersByTime(60_000));
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
  expect(vi.getTimerCount()).toBe(0);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
