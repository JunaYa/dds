import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { NativeSelect } from './select'

it('distinguishes pointer activation from keyboard focus without blurring the control', () => {
  render(<NativeSelect aria-label="Profile"><option>Arjun</option><option>Guoguo</option></NativeSelect>)
  const select = screen.getByRole('combobox')
  fireEvent.pointerDown(select)
  select.focus()
  expect(select).toHaveAttribute('data-focus-origin', 'pointer')
  expect(select).toHaveFocus()
  fireEvent.keyDown(select, { key: 'ArrowDown' })
  expect(select).not.toHaveAttribute('data-focus-origin')
  expect(select).toHaveFocus()
  fireEvent.pointerDown(select)
  fireEvent.blur(select)
  expect(select).not.toHaveAttribute('data-focus-origin')
})

it('preserves native selection and caller event handlers', () => {
  const pointer = vi.fn()
  const key = vi.fn()
  const blur = vi.fn()
  const change = vi.fn()
  render(<NativeSelect aria-label="Profile" defaultValue="one" onPointerDown={pointer}
    onKeyDown={key} onBlur={blur} onChange={change}>
    <option value="one">Arjun</option><option value="two">Guoguo</option>
  </NativeSelect>)
  const select = screen.getByRole('combobox')
  fireEvent.pointerDown(select)
  fireEvent.change(select, { target: { value: 'two' } })
  fireEvent.keyDown(select, { key: 'Tab' })
  fireEvent.blur(select)
  expect(select).toHaveValue('two')
  for (const handler of [pointer, key, blur, change]) expect(handler).toHaveBeenCalledOnce()
})

it('respects a caller that prevents pointer activation', () => {
  render(<NativeSelect aria-label="Profile" onPointerDown={event => event.preventDefault()}>
    <option>Arjun</option>
  </NativeSelect>)
  const select = screen.getByRole('combobox')
  fireEvent.pointerDown(select)
  expect(select).not.toHaveAttribute('data-focus-origin')
})
