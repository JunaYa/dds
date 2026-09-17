import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, newRecord } from './model';

const now = new Date('2026-09-16T09:00:00+08:00');
describe('journal workflows', () => {
  it('completes a recurring task once and skips missed fixed intervals', () => {
    const state = createInitialState(now, true);
    const task = state.tasks.find((task) => task.planId)!;
    const at = new Date(new Date(task.due).getTime() + 7 * 3600000);
    const action = {
      kind: 'record' as const,
      record: newRecord('routine', { result: '已完成' }, '执行记录', at),
      completeTaskId: task.id,
    };
    const next = applyAction(state, action, at);
    expect(next.tasks.filter((task) => task.planId && task.status === 'pending')).toHaveLength(1);
    expect(new Date(next.tasks.at(-1)!.due).getTime()).toBe(
      new Date(task.due).getTime() + 9 * 3600000,
    );
    expect(applyAction(next, action, at)).toEqual(next);
  });
  it('uses completion time for interval plans and respects pause', () => {
    const state = createInitialState(now, true);
    state.plan.mode = 'completion';
    const task = state.tasks.find((task) => task.planId)!;
    const at = new Date(now.getTime() + 4 * 3600000);
    const action = {
      kind: 'record' as const,
      record: newRecord('routine', { result: '已完成' }, '执行记录', at),
      completeTaskId: task.id,
    };
    expect(applyAction(state, action, at).tasks.at(-1)!.due).toBe(
      new Date(at.getTime() + 3 * 3600000).toISOString(),
    );
    state.plan.paused = true;
    expect(
      applyAction(state, action, at).tasks.filter((t) => t.planId && t.status === 'pending'),
    ).toHaveLength(0);
  });
  it('keeps event creation atomic and validates required custom fields', () => {
    const state = createInitialState(now);
    const record = newRecord('event', { place: '图书馆' }, '讲座', now);
    const next = applyAction(state, {
      kind: 'record',
      record,
      event: { due: '2026-09-18T09:30:00+08:00', reminder: 30 },
    });
    expect(next.tasks.at(-1)!.sourceRecordId).toBe(record.id);
    expect(next.records[0].eventAt).toBe('2026-09-18T09:30:00+08:00');
    expect(() =>
      applyAction(state, {
        kind: 'record',
        record: newRecord('water', {}, '饮水'),
      }),
    ).toThrow('饮水量');
    expect(() =>
      applyAction(state, {
        kind: 'plan',
        plan: { mode: 'fixed', interval: 0, paused: false },
      }),
    ).toThrow();
  });
  it('records count timestamps, undoes once, then saves one session', () => {
    let state = applyAction(createInitialState(now), { kind: 'session', operation: 'start' }, now);
    for (const operation of ['count', 'count', 'undo', 'finish'] as const)
      state = applyAction(state, { kind: 'session', operation }, now);
    expect(state.session).toBeNull();
    expect(state.records[0].values.count).toBe(1);
    expect(state.records[0].events).toHaveLength(1);
    expect(applyAction(state, { kind: 'session', operation: 'finish' }, now)).toEqual(state);
  });
});
