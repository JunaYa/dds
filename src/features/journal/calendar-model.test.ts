import { describe, expect, it } from 'vitest';
import { createInitialState, newRecord } from './model';
import { calendarDateKey, calendarDays, dateInMonth } from './calendar-model';

describe('calendar dates', () => {
  it('groups by the local occurrence date and keeps midnight and cross-day feeding on the correct dates', () => {
    const state = createInitialState();
    const start = new Date(2026, 8, 17, 23, 50);
    state.records = [
      newRecord('feeding', { startedAt: start.toISOString(), endedAt: new Date(2026, 8, 18, 0, 10).toISOString() }, '跨午夜哺乳', start),
      newRecord('note', { content: '午夜之后' }, '新的一天', new Date(2026, 8, 18, 0, 5)),
      newRecord('note', { content: '更早的一笔' }, '晚间记录', new Date(2026, 8, 17, 21)),
    ];
    const original = [...state.records];
    const days = calendarDays(state);
    expect(days.get('2026-09-17')?.records.map((record) => record.title)).toEqual(['晚间记录', '跨午夜哺乳']);
    expect(days.get('2026-09-18')?.records.map((record) => record.title)).toEqual(['新的一天']);
    expect(state.records).toEqual(original);
    expect(calendarDateKey('invalid')).toBe('');
  });

  it('counts only pending tasks on their due dates and applies the type filter to both lists', () => {
    const state = createInitialState();
    state.records = [newRecord('water', { amount: 250 }, '喝水', new Date(2026, 8, 18, 10))];
    state.tasks = [
      { id: 'later', title: '补充水分', typeId: 'water', due: new Date(2026, 8, 18, 12).toISOString(), note: '', status: 'pending' },
      { id: 'earlier', title: '记日记', typeId: 'note', due: new Date(2026, 8, 18, 9).toISOString(), note: '', status: 'pending' },
      { id: 'done', title: '已完成的待办', typeId: 'water', due: new Date(2026, 8, 19, 9).toISOString(), note: '', status: 'done' },
    ];
    expect(calendarDays(state).get('2026-09-18')?.tasks.map((task) => task.id)).toEqual(['earlier', 'later']);
    expect(calendarDays(state).has('2026-09-19')).toBe(false);
    expect(calendarDays(state, 'water').get('2026-09-18')).toMatchObject({
      records: [{ title: '喝水' }], tasks: [{ id: 'later' }],
    });
    expect(calendarDays(state, 'feeding').size).toBe(0);
  });

  it('clamps month navigation at leap days and changes years without skipping months', () => {
    expect(calendarDateKey(dateInMonth(new Date(2024, 0, 31), new Date(2024, 1, 1)))).toBe('2024-02-29');
    expect(calendarDateKey(dateInMonth(new Date(2026, 0, 31), new Date(2026, 1, 1)))).toBe('2026-02-28');
    expect(calendarDateKey(dateInMonth(new Date(2026, 11, 31), new Date(2027, 0, 1)))).toBe('2027-01-31');
  });
});
