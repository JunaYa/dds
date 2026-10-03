import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { CalendarDaysIcon } from 'lucide-react'
import { enUS, zhCN } from 'react-day-picker/locale'
import { Button } from '../button/button'
import { Calendar } from '../calendar/calendar'
import { Input } from '../input/input'
import { Popover, PopoverPopup, PopoverTrigger } from '../popover/popover'
import { cn } from '../lib/utils'

export type DateTimePickerProps = Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  mode?: 'date' | 'datetime'
  locale?: string
  min?: string
  max?: string
}

function parse(value: string, mode: 'date' | 'datetime'): Date | undefined {
  const match = (
    mode === 'date'
      ? /^(\d{4})-(\d{2})-(\d{2})$/
      : /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  ).exec(value)
  if (!match) return
  const [, year, month, day, hour = '0', minute = '0'] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  )
  if (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day) &&
    date.getHours() === Number(hour) &&
    date.getMinutes() === Number(minute)
  )
    return date
}
function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Local wall-clock values; never converts a date to UTC or changes its time zone. */
export function DateTimePicker({
  value,
  defaultValue = '',
  onValueChange,
  mode = 'datetime',
  locale = 'en',
  min,
  max,
  className,
  disabled,
  readOnly,
  ref,
  placeholder,
  ...props
}: DateTimePickerProps) {
  const [internal, setInternal] = useState(defaultValue)
  const current = value ?? internal
  const selected = parse(current, mode)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(selected ?? new Date())
  const input = useRef<HTMLInputElement | null>(null)
  const zh = locale.toLowerCase().startsWith('zh')
  const text = zh
    ? {
        open: '打开日期选择器',
        time: '时间',
        done: '完成',
        invalid: '请输入有效的日期和时间。',
        bounds: '日期和时间超出允许范围。',
        previous: '上个月',
        next: '下个月',
        month: '月份',
        year: '年份'
      }
    : {
        open: 'Open date picker',
        time: 'Time',
        done: 'Done',
        invalid: 'Enter a valid date and time.',
        bounds: 'Date and time are outside the allowed range.',
        previous: 'Previous month',
        next: 'Next month',
        month: 'Month',
        year: 'Year'
      }
  useEffect(() => {
    input.current?.setCustomValidity(
      current && !selected
        ? text.invalid
        : current && ((min && current < min) || (max && current > max))
          ? text.bounds
          : ''
    )
  }, [current, mode, min, max, text.invalid, text.bounds])
  function change(next: string) {
    if (disabled || readOnly) return
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }
  return (
    <div
      data-slot="date-time-picker"
      className={cn('flex min-w-0 items-center gap-2', className)}
    >
      <Input
        nativeInput
        {...props}
        ref={(node) => {
          input.current = node
          if (typeof ref === 'function') return ref(node)
          if (ref) ref.current = node
        }}
        disabled={disabled}
        readOnly={readOnly}
        type="text"
        autoComplete="off"
        placeholder={
          placeholder ?? (mode === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm')
        }
        value={current.replace('T', ' ')}
        onChange={(event) => change(event.target.value.replace(' ', 'T'))}
      />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setMonth(selected ?? new Date())
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            disabled={disabled || readOnly}
            aria-label={text.open}
          >
            <CalendarDaysIcon aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverPopup
          positionerClassName="z-[calc(var(--z-layer-modal,600)+10)]"
          aria-label={text.open}
          align="end"
          className="max-h-[min(80dvh,560px)] overflow-y-auto"
        >
          <Calendar
            mode="single"
            locale={zh ? zhCN : enUS}
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            captionLayout="dropdown"
            startMonth={min ? parse(min, mode) : new Date(1900, 0)}
            endMonth={
              max
                ? parse(max, mode)
                : new Date(new Date().getFullYear() + 10, 11)
            }
            disabled={[
              ...(min
                ? [{ before: new Date(`${min.slice(0, 10)}T00:00`) }]
                : []),
              ...(max
                ? [{ after: new Date(`${max.slice(0, 10)}T23:59:59`) }]
                : [])
            ]}
            formatters={{
              formatMonthDropdown: (date) =>
                date.toLocaleString(locale, { month: 'long' })
            }}
            labels={{
              labelPrevious: () => text.previous,
              labelNext: () => text.next,
              labelMonthDropdown: () => text.month,
              labelYearDropdown: () => text.year,
              labelDayButton: (date) =>
                date.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })
            }}
            onSelect={(date) => {
              if (!date) return
              change(
                dateString(date) +
                  (mode === 'datetime'
                    ? `T${selected ? current.slice(11) : '00:00'}`
                    : '')
              )
              if (mode === 'date') setOpen(false)
            }}
          />
          {mode === 'datetime' && (
            <label className="mt-3 flex items-center gap-3 text-sm">
              {text.time}
              <Input
                nativeInput
                type="time"
                value={selected ? current.slice(11) : ''}
                onChange={(event) => {
                  if (event.target.value)
                    change(
                      `${selected ? dateString(selected) : dateString(new Date())}T${event.target.value}`
                    )
                }}
              />
            </label>
          )}
          <Button
            type="button"
            className="mt-3 w-full"
            onClick={() => setOpen(false)}
          >
            {text.done}
          </Button>
        </PopoverPopup>
      </Popover>
    </div>
  )
}
