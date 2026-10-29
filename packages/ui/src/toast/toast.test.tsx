import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Toast } from './toast'

afterEach(() => vi.useRealTimers())

it('announces feedback through a portal and dismisses after its duration', () => {
  vi.useFakeTimers()
  const dismiss = vi.fn()
  const { container } = render(<Toast onDismiss={dismiss}>Child added</Toast>)
  expect(screen.getByRole('status')).toHaveTextContent('Child added')
  expect(container).toBeEmptyDOMElement()
  act(() => vi.advanceTimersByTime(4999))
  expect(dismiss).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(dismiss).toHaveBeenCalledOnce()
})

it('cancels the pending dismissal when unmounted', () => {
  vi.useFakeTimers()
  const dismiss = vi.fn()
  const { unmount } = render(<Toast onDismiss={dismiss}>Saved</Toast>)
  unmount()
  act(() => vi.runAllTimers())
  expect(dismiss).not.toHaveBeenCalled()
})
