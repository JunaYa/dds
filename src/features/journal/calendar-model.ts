import type { JournalRecord, JournalState, JournalTask } from './model';

export function calendarDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return '';
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');
}

export function dateInMonth(date: Date, month: Date) {
  const year = month.getFullYear();
  const index = month.getMonth();
  return new Date(year, index, Math.min(date.getDate(), new Date(year, index + 1, 0).getDate()));
}

export function calendarDays(state: JournalState, typeId = 'all') {
  const days = new Map<string, { records: JournalRecord[]; tasks: JournalTask[] }>();
  function dayFor(date: string) {
    const key = calendarDateKey(date);
    if (!key) return;
    let day = days.get(key);
    if (!day) {
      day = { records: [], tasks: [] };
      days.set(key, day);
    }
    return day;
  }
  for (const record of state.records)
    if (typeId === 'all' || record.typeId === typeId)
      dayFor(record.occurredAt)?.records.push(record);
  for (const task of state.tasks)
    if (task.status === 'pending' && (typeId === 'all' || task.typeId === typeId))
      dayFor(task.due)?.tasks.push(task);
  for (const day of days.values()) {
    day.records.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    day.tasks.sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
  }
  return days;
}
