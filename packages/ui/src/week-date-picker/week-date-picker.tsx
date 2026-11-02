import { useState } from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { enUS, zhCN } from 'react-day-picker/locale'
import { Button } from '../button/button'
import { Calendar } from '../calendar/calendar'
import { Popover, PopoverPopup, PopoverTrigger } from '../popover/popover'

function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function offsetDate(value: Date, offset: number): Date {
  const next = new Date(value)
  next.setDate(next.getDate() + offset)
  return next
}

export interface WeekDatePickerProps {
  value: string
  today: string
  selected?: boolean
  locale: string
  onValueChange: (value: string) => void
  labels: { previousWeek: string; nextWeek: string; today: string; chooseDate: string }
}

export function WeekDatePicker({ value, today, selected = true, locale, onValueChange, labels }: WeekDatePickerProps) {
  const [open, setOpen] = useState(false)
  const date = new Date(`${value}T12:00:00`)
  const monday = offsetDate(date, -((date.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, index) => offsetDate(monday, index))
  return (
    <div data-slot="week-date-picker" className="w-full min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="ghost" />} aria-label={labels.chooseDate}>
            {date.toLocaleDateString(locale, { year: 'numeric', month: 'long' })}
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </PopoverTrigger>
          <PopoverPopup>
            <Calendar
              mode="single"
              weekStartsOn={1}
              locale={locale.startsWith('zh') ? zhCN : enUS}
              defaultMonth={date}
              selected={selected ? date : undefined}
              onSelect={(next) => {
                if (!next) return
                onValueChange(localDate(next))
                setOpen(false)
              }}
            />
          </PopoverPopup>
        </Popover>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={labels.previousWeek} onClick={() => onValueChange(localDate(offsetDate(date, -7)))}>
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button variant="ghost" onClick={() => onValueChange(today)}>{labels.today}</Button>
          <Button variant="ghost" size="icon" aria-label={labels.nextWeek} onClick={() => onValueChange(localDate(offsetDate(date, 7)))}>
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5" role="group" aria-label={labels.chooseDate}>
        {days.map((day) => {
          const key = localDate(day)
          const active = selected && key === value
          return (
            <Button
              key={key}
              variant={active ? 'default' : 'ghost'}
              className="h-auto min-h-20 min-w-0 flex-col gap-2 rounded-2xl px-0 py-3 font-medium tabular-nums"
              aria-label={day.toLocaleDateString(locale, { dateStyle: 'full' })}
              aria-pressed={active}
              aria-current={key === today ? 'date' : undefined}
              onClick={() => onValueChange(key)}
            >
              <span className={active ? 'text-xs' : 'text-xs text-muted-foreground'}>{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
              <span className="text-lg">{day.getDate()}</span>
              <span aria-hidden="true" className={`size-1 rounded-full ${key === today ? 'bg-current' : 'bg-transparent'}`} />
            </Button>
          )
        })}
      </div>
    </div>
  )
}
