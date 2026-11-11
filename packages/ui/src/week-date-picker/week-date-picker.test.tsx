import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { WeekDatePicker } from './week-date-picker'

const labels = { chooseDate: 'Choose date' }

it('updates selection immediately during rapid changes and preserves keyboard focus', () => {
  function Picker() {
    const [value, setValue] = useState('2027-01-01')
    return <WeekDatePicker value={value} today="2027-01-01" locale="en-US" labels={labels} onValueChange={setValue} />
  }
  render(<Picker />)
  const saturday = screen.getByRole('button', { name: 'Saturday, January 2, 2027' })
  fireEvent.pointerDown(saturday)
  fireEvent.click(saturday)
  expect(saturday).toHaveAttribute('aria-pressed', 'true')
  const friday = screen.getByRole('button', { name: 'Friday, January 1, 2027' })
  friday.focus()
  fireEvent.keyDown(friday, { key: 'Enter' })
  fireEvent.click(friday, { detail: 0 })
  expect(friday).toHaveFocus()
  expect(friday).toHaveAttribute('aria-pressed', 'true')
  expect(saturday).toHaveAttribute('aria-pressed', 'false')
})

it('shows a Monday-first week across years and selects local calendar dates', () => {
  const onValueChange = vi.fn()
  render(<WeekDatePicker value="2027-01-01" today="2027-01-02" locale="en-US" labels={labels} onValueChange={onValueChange} />)
  const dates = screen.getAllByRole('button', { pressed: false })
  expect(dates[0]).toHaveAccessibleName('Monday, December 28, 2026')
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName('Friday, January 1, 2027')
  fireEvent.click(screen.getByRole('button', { name: 'Sunday, January 3, 2027' }))
  expect(onValueChange).toHaveBeenLastCalledWith('2027-01-03')
  expect(screen.getByRole('button', { name: 'Saturday, January 2, 2027' })).toHaveAttribute('aria-current', 'date')
})

it('leaves dates unselected when viewing all records and localizes weekday labels', () => {
  render(<WeekDatePicker value="2026-10-30" today="2026-10-30" selected={false} locale="zh-CN" labels={labels} onValueChange={() => {}} />)
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(7)
  expect(screen.getByText('周一')).toBeInTheDocument()
})
