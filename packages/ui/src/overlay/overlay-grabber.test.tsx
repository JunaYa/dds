import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Dialog, DialogPopup, DialogTitle } from '../dialog/dialog'
import { OverlayProvider } from './overlay-provider'
import { Sheet, SheetPopup, SheetTitle } from '../sheet/sheet'

afterEach(() => vi.unstubAllGlobals())

function setup(kind: 'dialog' | 'sheet' = 'dialog') {
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId = 1
    isPrimary = true
  })
  const change = vi.fn()
  render(<OverlayProvider platform="ios">{kind === 'dialog' ? <Dialog open onOpenChange={change}>
    <DialogPopup closeLabel="Close editor"><DialogTitle>Edit record</DialogTitle></DialogPopup>
  </Dialog> : <Sheet open onOpenChange={change}>
    <SheetPopup side="bottom"><SheetTitle>Edit record</SheetTitle></SheetPopup>
  </Sheet>}</OverlayProvider>)
  const grabber = document.querySelector<HTMLElement>('[data-slot="overlay-grabber"]')!
  grabber.setPointerCapture = vi.fn()
  grabber.hasPointerCapture = vi.fn(() => true)
  grabber.releasePointerCapture = vi.fn()
  return { grabber, change, popup: screen.getByRole('dialog') }
}

it.each(['dialog', 'sheet'] as const)('follows a downward drag and dismisses the %s through its controlled close callback', kind => {
  const { grabber, change, popup } = setup(kind)
  fireEvent.pointerDown(grabber, { clientY: 10, button: 0 })
  fireEvent.pointerMove(grabber, { clientY: 110 })
  expect(popup.style.getPropertyValue('--overlay-drag-offset')).toBe('100px')
  fireEvent.pointerUp(grabber, { clientY: 110 })
  expect(change).toHaveBeenCalledWith(false, expect.anything())
  expect(popup).not.toHaveAttribute('data-overlay-dragging')
})

it.each(['short', 'upward', 'cancelled', 'lost capture'])('restores the sheet without dismissing after a %s gesture', kind => {
  const { grabber, change, popup } = setup()
  fireEvent.pointerDown(grabber, { clientY: 100, button: 0 })
  fireEvent.pointerMove(grabber, { clientY: kind === 'upward' ? 20 : kind === 'short' ? 125 : 220 })
  if (kind === 'cancelled') fireEvent.pointerCancel(grabber)
  else if (kind === 'lost capture') fireEvent.lostPointerCapture(grabber)
  else fireEvent.pointerUp(grabber)
  expect(change).not.toHaveBeenCalled()
  expect(popup).not.toHaveAttribute('data-overlay-dragging')
  expect(popup.style.getPropertyValue('--overlay-drag-offset')).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Close editor' }))
  expect(change).toHaveBeenCalledWith(false, expect.anything())
})
