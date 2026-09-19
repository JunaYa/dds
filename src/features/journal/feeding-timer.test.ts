import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, newRecord, stateSchema } from './model';

const start = new Date('2026-09-18T23:59:30+08:00');
const end = new Date(start.getTime() + 95_000);
const draft = { title: '夜间喂养', values: { method: '混合喂养' } };

describe('feeding timer lifecycle', () => {
  it('starts without a quantity, restores from storage, and stops once across midnight', () => {
    const initial = createInitialState(start);
    const running = applyAction(
      initial,
      { kind: 'feedingTimer', operation: 'start', ...draft },
      start,
    );
    const timer = running.feedingTimer!;
    expect(timer.startedAt).toBe(start.toISOString());
    expect(timer.endedAt).toBeUndefined();
    expect(running.records).toEqual([]);
    const restored = stateSchema.parse(JSON.parse(JSON.stringify(running)));
    expect(
      applyAction(restored, { kind: 'feedingTimer', operation: 'start', ...draft }, end),
    ).toEqual(restored);
    const stopped = applyAction(
      restored,
      {
        kind: 'feedingTimer',
        operation: 'stop',
        timerId: timer.id,
        ...draft,
      },
      end,
    );
    expect(stopped.feedingTimer?.endedAt).toBe(end.toISOString());
    expect(
      applyAction(
        stopped,
        {
          kind: 'feedingTimer',
          operation: 'stop',
          timerId: timer.id,
          ...draft,
        },
        new Date(end.getTime() + 60_000),
      ),
    ).toEqual(stopped);
    expect(initial.feedingTimer).toBeNull();
  });

  it('retains stopped timing on failed validation and consumes it atomically on one save', () => {
    let state = applyAction(
      createInitialState(start),
      { kind: 'feedingTimer', operation: 'start', ...draft },
      start,
    );
    const timer = state.feedingTimer!;
    const record = {
      ...newRecord(
        'feeding',
        { ...draft.values, startedAt: timer.startedAt, endedAt: end.toISOString() },
        draft.title,
      ),
      id: timer.id,
    };
    expect(() =>
      applyAction(state, { kind: 'record', record, feedingTimerId: timer.id }),
    ).toThrow('请先结束计时');
    state = applyAction(
      state,
      { kind: 'feedingTimer', operation: 'stop', timerId: timer.id, ...draft },
      end,
    );
    expect(() =>
      applyAction(state, { kind: 'record', record, feedingTimerId: timer.id }),
    ).toThrow('喂养量');
    expect(state.feedingTimer?.id).toBe(timer.id);
    const action = {
      kind: 'record' as const,
      record: { ...record, values: { ...record.values, amount: 90 } },
      feedingTimerId: timer.id,
    };
    const saved = applyAction(state, action);
    expect(saved.feedingTimer).toBeNull();
    expect(saved.records).toHaveLength(1);
    expect(saved.records[0].occurredAt).toBe(start.toISOString());
    expect(applyAction(saved, action)).toEqual(saved);
  });

  it('does not let an old window stop, discard or save a newer timer', () => {
    let state = applyAction(
      createInitialState(start),
      { kind: 'feedingTimer', operation: 'start', ...draft },
      start,
    );
    const old = state.feedingTimer!;
    state = applyAction(state, {
      kind: 'feedingTimer',
      operation: 'discard',
      timerId: old.id,
    });
    state = applyAction(state, { kind: 'feedingTimer', operation: 'start', ...draft }, end);
    for (const operation of ['stop', 'discard'] as const)
      expect(() =>
        applyAction(state, { kind: 'feedingTimer', operation, timerId: old.id, ...draft }),
      ).toThrow('计时状态已改变');
    expect(() =>
      applyAction(state, {
        kind: 'record',
        feedingTimerId: old.id,
        record: {
          ...newRecord(
            'feeding',
            {
              ...draft.values,
              startedAt: start.toISOString(),
              endedAt: end.toISOString(),
              amount: 90,
            },
            draft.title,
          ),
          id: old.id,
        },
      }),
    ).toThrow('计时状态已改变');
    expect(state.feedingTimer?.startedAt).toBe(end.toISOString());
  });

  it('reads older data with no timer and rejects a backwards clock when stopping', () => {
    const { feedingTimer: _timer, ...legacy } = createInitialState(start);
    expect(stateSchema.parse(legacy).feedingTimer).toBeNull();
    const running = applyAction(
      createInitialState(start),
      { kind: 'feedingTimer', operation: 'start', ...draft },
      start,
    );
    expect(() =>
      applyAction(
        running,
        {
          kind: 'feedingTimer',
          operation: 'stop',
          timerId: running.feedingTimer!.id,
          ...draft,
        },
        new Date(start.getTime() - 1000),
      ),
    ).toThrow('结束时间不能早于开始时间');
  });
});
