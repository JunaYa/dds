import { useMemo, useState, type ComponentProps } from 'react';
import { Calendar } from '@vita/ui/calendar';
import { Button } from '@vita/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@vita/ui/card';
import { Badge } from '@vita/ui/badge';
import { Icons } from '@vita/ui/icons';
import { Choice } from './controls';
import { useJournal } from './journal-context';
import { TypeGlyph } from './type-appearance-editor';
import { formatTime, summary, type JournalRecord, type JournalTask } from './model';
import { calendarDateKey, calendarDays, dateInMonth } from './calendar-model';

type CalendarDayProps = ComponentProps<
  NonNullable<NonNullable<ComponentProps<typeof Calendar>['components']>['Day']>
>;

function ActivityDay({ day, modifiers, children, ...props }: CalendarDayProps) {
  return (
    <td {...props}>
      {children}
      {!modifiers.hidden && (
        <span className="journal-calendar-markers" aria-hidden="true">
          {modifiers.recorded && <span className="journal-calendar-record-dot" />}
          {modifiers.pending && <span className="journal-calendar-task-dot" />}
        </span>
      )}
    </td>
  );
}

const fullDate = (date: Date) =>
  date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
const monthLabel = (date: Date) =>
  date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

export function BoardCalendar({
  onOpenRecord,
  onOpenTask,
}: {
  onOpenRecord: (record: JournalRecord) => void;
  onOpenTask: (task: JournalTask) => void;
}) {
  const { state } = useJournal();
  const [selected, setSelected] = useState(() => new Date());
  const [typeId, setTypeId] = useState('all');
  const days = useMemo(() => calendarDays(state, typeId), [state, typeId]);
  const selectedDay = days.get(calendarDateKey(selected));
  const records = selectedDay?.records || [];
  const tasks = selectedDay?.tasks || [];
  return (
    <div className="journal-calendar-layout">
      <Card className="min-w-0 gap-4">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>生活日历</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Date())}>
              回到今天
            </Button>
          </div>
          <div className="mt-3 [&_[data-slot=select-trigger]]:min-h-11">
            <Choice
              label="日历记录类型"
              value={typeId}
              options={[
                { value: 'all', label: '全部类型' },
                ...state.types.map((type) => ({ value: type.id, label: type.name })),
              ]}
              onChange={setTypeId}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-4">
          <Calendar
            className="journal-calendar w-full"
            mode="single"
            required
            selected={selected}
            onSelect={setSelected}
            month={selected}
            onMonthChange={(month) => setSelected((date) => dateInMonth(date, month))}
            weekStartsOn={1}
            fixedWeeks
            aria-label="记录日历"
            components={{ Day: ActivityDay }}
            classNames={{
              day: 'journal-calendar-day relative h-auto w-auto p-0',
              day_button: 'h-16 w-full items-start pt-3',
              weekday: 'h-9 w-auto',
              button_previous: 'size-11',
              button_next: 'size-11',
              month_caption: 'h-11',
            }}
            modifiers={{
              recorded: (date) => !!days.get(calendarDateKey(date))?.records.length,
              pending: (date) => !!days.get(calendarDateKey(date))?.tasks.length,
            }}
            formatters={{
              formatCaption: monthLabel,
              formatWeekdayName: (date) =>
                date.toLocaleDateString('zh-CN', { weekday: 'short' }),
            }}
            labels={{
              labelNext: () => '下个月',
              labelPrevious: () => '上个月',
              labelNav: () => '切换月份',
              labelGrid: (date) => `${monthLabel(date)}日历`,
              labelWeekday: (date) => date.toLocaleDateString('zh-CN', { weekday: 'long' }),
              labelDayButton: (date, modifiers) => {
                const day = days.get(calendarDateKey(date));
                return `${fullDate(date)}${modifiers.today ? '，今天' : ''}，${day?.records.length || 0} 条记录，${day?.tasks.length || 0} 件待办`;
              },
            }}
          />
          <div className="mt-4 flex justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="journal-calendar-record-dot" aria-hidden="true" />
              有记录
            </span>
            <span className="flex items-center gap-2">
              <span className="journal-calendar-task-dot" aria-hidden="true" />
              有待办
            </span>
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0" role="region" aria-label="当天明细">
        <CardHeader>
          <h2 className="text-base font-semibold leading-6" aria-live="polite">
            {fullDate(selected)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {records.length} 条记录 · {tasks.length} 件待办
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!!tasks.length && (
            <section aria-label="当天待办">
              <h3 className="mb-2 text-sm font-medium">待办与安排</h3>
              <ul className="divide-y">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Button
                      variant="ghost"
                      className="h-auto min-h-16 w-full justify-start whitespace-normal px-0 py-3 text-left"
                      onClick={() => onOpenTask(task)}
                    >
                      <time
                        dateTime={task.due}
                        className="w-11 shrink-0 self-start pt-1 text-xs tabular-nums text-muted-foreground"
                      >
                        {formatTime(task.due)}
                      </time>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block break-words text-sm">{task.title}</span>
                        <span className="block break-words text-xs font-normal text-muted-foreground">
                          {task.note ||
                            state.types.find((type) => type.id === task.typeId)?.name}
                        </span>
                      </span>
                      <Icons.arrowRight className="size-4 shrink-0" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!!records.length && (
            <section aria-label="当天记录">
              <h3 className="mb-2 text-sm font-medium">留下的记录</h3>
              <ul className="divide-y">
                {records.map((record) => {
                  const type = state.types.find((item) => item.id === record.typeId);
                  return (
                    <li key={record.id}>
                      <Button
                        variant="ghost"
                        className="h-auto min-h-16 w-full justify-start whitespace-normal px-0 py-3 text-left"
                        onClick={() => onOpenRecord(record)}
                      >
                        <TypeGlyph type={type} />
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block break-words text-sm">{record.title}</span>
                          <span className="line-clamp-2 break-words text-xs font-normal text-muted-foreground">
                            {summary(record, type) || '图片与附件记录'}
                          </span>
                          <Badge variant="secondary">{type?.name}</Badge>
                        </span>
                        <time
                          dateTime={record.occurredAt}
                          className="shrink-0 self-start pt-1 text-xs tabular-nums text-muted-foreground"
                        >
                          {formatTime(record.occurredAt)}
                        </time>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {!tasks.length && !records.length && (
            <p className="py-8 text-sm leading-6 text-muted-foreground">
              {typeId === 'all'
                ? '这一天还没有记录或待办，试试其他日期。'
                : '这一天没有该类型的记录或待办，可以切换类型或日期。'}
            </p>
          )}
          <p className="border-t pt-4 text-xs leading-5 text-muted-foreground">
            记录按发生时间归档，待办按计划时间展示。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
