import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OverlayProvider } from '../overlay/overlay-provider'
import { DateTimePicker } from './date-time-picker'

afterEach(cleanup)
it('uses the system date/time control on iOS without UTC conversion', () => {
  const onChange = vi.fn()
  const ref = createRef<HTMLInputElement>()
  render(<OverlayProvider platform="ios"><DateTimePicker
    aria-label="Record time" name="time" required ref={ref}
    value="2026-10-18T22:30" min="2026-10-01T00:00" onValueChange={onChange}
  /></OverlayProvider>)
  const input = screen.getByLabelText('Record time')
  expect(input).toHaveAttribute('type', 'datetime-local')
  expect(input).toHaveAttribute('min', '2026-10-01T00:00')
  expect(input).toBeRequired()
  expect(ref.current).toBe(input)
  fireEvent.change(input, { target: { value: '2026-10-19T00:15' } })
  expect(onChange).toHaveBeenCalledWith('2026-10-19T00:15')
  expect(screen.queryByRole('button', {name:'Open date picker'})).not.toBeInTheDocument()
})
it('preserves a date-only value and read-only state', () => {
  render(<OverlayProvider platform="ios"><DateTimePicker aria-label="Birthday" mode="date" defaultValue="2026-05-01" readOnly /></OverlayProvider>)
  expect(screen.getByLabelText('Birthday')).toHaveAttribute('type', 'date')
  expect(screen.getByLabelText('Birthday')).toHaveValue('2026-05-01')
  expect(screen.getByLabelText('Birthday')).toHaveAttribute('readonly')
})
