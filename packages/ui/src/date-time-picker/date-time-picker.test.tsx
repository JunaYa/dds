import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription
} from '../dialog/dialog'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { DateTimePicker } from './date-time-picker'

it('keeps local time values and permits clearing a controlled input', () => {
  const changed = vi.fn()
  function Form() {
    const [value, setValue] = useState('2026-10-03T09:15')
    return (
      <DateTimePicker
        aria-label="Recorded at"
        value={value}
        onValueChange={(next) => {
          setValue(next)
          changed(next)
        }}
      />
    )
  }
  render(<Form />)
  fireEvent.change(screen.getByLabelText('Recorded at'), {
    target: { value: '2026-10-04 10:30' }
  })
  expect(changed).toHaveBeenLastCalledWith('2026-10-04T10:30')
  expect(screen.getByLabelText('Recorded at')).toHaveValue('2026-10-04 10:30')
  fireEvent.change(screen.getByLabelText('Recorded at'), {
    target: { value: '' }
  })
  expect(changed).toHaveBeenLastCalledWith('')
})

it('rejects invalid dates and out-of-range values before form submission', () => {
  render(
    <form>
      <DateTimePicker
        aria-label="Birthday"
        mode="date"
        required
        max="2026-10-03"
      />
    </form>
  )
  const input = screen.getByLabelText('Birthday') as HTMLInputElement
  expect(input.checkValidity()).toBe(false)
  fireEvent.change(input, { target: { value: '2026-02-30' } })
  expect(input.checkValidity()).toBe(false)
  fireEvent.change(input, { target: { value: '2027-01-01' } })
  expect(input.checkValidity()).toBe(false)
  fireEvent.change(input, { target: { value: '2024-02-29' } })
  expect(input.checkValidity()).toBe(true)
})

it('selects a localized calendar date without submitting its parent form', async () => {
  const user = userEvent.setup()
  const submitted = vi.fn((event) => event.preventDefault())
  const changed = vi.fn()
  render(
    <form onSubmit={submitted}>
      <DateTimePicker
        aria-label="日期"
        locale="zh-CN"
        mode="date"
        defaultValue="2026-10-03"
        onValueChange={changed}
      />
    </form>
  )
  await user.click(screen.getByRole('button', { name: '打开日期选择器' }))
  await user.click(
    screen.getByRole('button', {
      name: new Date(2026, 9, 4).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    })
  )
  expect(changed).toHaveBeenLastCalledWith('2026-10-04')
  expect(screen.getByLabelText('日期')).toHaveValue('2026-10-04')
  expect(submitted).not.toHaveBeenCalled()
})

it('prevents edits and calendar opening when disabled', () => {
  render(
    <DateTimePicker
      disabled
      aria-label="Time"
      defaultValue="2026-10-03T09:00"
    />
  )
  expect(screen.getByLabelText('Time')).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'Open date picker' })
  ).toBeDisabled()
})

it('works inside a record dialog without closing the dialog when picking a date', async () => {
  const user = userEvent.setup()
  render(
    <Dialog defaultOpen>
      <DialogPopup>
        <DialogTitle>Record</DialogTitle>
        <DialogDescription>Record details</DialogDescription>
        <DateTimePicker aria-label="When" defaultValue="2026-10-03T09:15" />
      </DialogPopup>
    </Dialog>
  )
  await user.click(screen.getByRole('button', { name: 'Open date picker' }))
  await user.click(
    screen.getByRole('button', {
      name: new Date(2026, 9, 4).toLocaleDateString('en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    })
  )
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.getByRole('dialog', { name: 'Record' })).toBeInTheDocument()
  expect(screen.getByLabelText('When')).toHaveValue('2026-10-04 09:15')
})
