import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { WeekDatePicker } from './week-date-picker'

const labels = { previousWeek: 'Previous week', nextWeek: 'Next week', today: 'Today', chooseDate: 'Choose date' }

it('shows a Monday-first week across years and selects local calendar dates', () => {
  const onValueChange = vi.fn()
  render(<WeekDatePicker value="2027-01-01" today="2027-01-02" locale="en-US" labels={labels} onValueChange={onValueChange} />)
  const dates = screen.getAllByRole('button', { pressed: false })
  expect(dates[0]).toHaveAccessibleName('Monday, December 28, 2026')
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName('Friday, January 1, 2027')
  fireEvent.click(screen.getByRole('button', { name: 'Sunday, January 3, 2027' }))
  expect(onValueChange).toHaveBeenLastCalledWith('2027-01-03')
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
  expect(onValueChange).toHaveBeenLastCalledWith('2026-12-25')
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
  expect(onValueChange).toHaveBeenLastCalledWith('2027-01-08')
  fireEvent.click(screen.getByRole('button', { name: 'Today' }))
  expect(onValueChange).toHaveBeenLastCalledWith('2027-01-02')
})

it('leaves dates unselected when viewing all records and localizes weekday labels', () => {
  render(<WeekDatePicker value="2026-10-30" today="2026-10-30" selected={false} locale="zh-CN" labels={labels} onValueChange={() => {}} />)
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(7)
  expect(screen.getByText('周一')).toBeInTheDocument()
})
