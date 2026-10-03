import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { WheelPicker } from './wheel-picker'
const options = ['00', '01', '02'].map((value) => ({ value, label: value }))
it('supports keyboard selection and clamps at either end', () => {
  const onValueChange = vi.fn()
  render(
    <WheelPicker
      label="Minute"
      options={options}
      defaultValue="01"
      onValueChange={onValueChange}
    />
  )
  const wheel = screen.getByRole('spinbutton', { name: 'Minute' })
  fireEvent.keyDown(wheel, { key: 'ArrowDown' })
  expect(wheel).toHaveAttribute('aria-valuetext', '02')
  fireEvent.keyDown(wheel, { key: 'ArrowDown' })
  expect(onValueChange).toHaveBeenLastCalledWith('02')
  fireEvent.keyDown(wheel, { key: 'Home' })
  expect(wheel).toHaveAttribute('aria-valuetext', '00')
})
it('does not render an invalid spinbutton for an empty option set', () => {
  render(<WheelPicker label="Empty" options={[]} />)
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
})
