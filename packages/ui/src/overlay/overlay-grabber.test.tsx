import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Dialog, DialogPopup, DialogTitle, DialogHeader } from '../dialog/dialog'
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
    <DialogPopup closeLabel="Close editor"><DialogHeader><DialogTitle>Edit record</DialogTitle></DialogHeader><p>Scrollable form content</p></DialogPopup>
  </Dialog> : <Sheet open onOpenChange={change}>
    <SheetPopup side="bottom"><SheetTitle>Edit record</SheetTitle></SheetPopup>
  </Sheet>}</OverlayProvider>)
  const grabber = document.querySelector<HTMLElement>('[data-slot="overlay-grabber"]')!
  const popup = screen.getByRole('dialog')
  popup.setPointerCapture = vi.fn()
  popup.hasPointerCapture = vi.fn(() => true)
  popup.releasePointerCapture = vi.fn()
  return { grabber, change, popup }
}

it.each(['dialog', 'sheet'] as const)('follows a downward drag and dismisses the %s through its controlled close callback', kind => {
  const { grabber, change, popup } = setup(kind)
  fireEvent.pointerDown(grabber, { clientY: 10, button: 0 })
  fireEvent.pointerMove(grabber, { clientY: 110 })
  expect(popup.style.getPropertyValue('--overlay-drag-offset')).toBe('100px')
  fireEvent.pointerUp(grabber, { clientY: 110 })
  expect(change).toHaveBeenCalledWith(false, expect.anything())
  expect(popup).not.toHaveAttribute('data-overlay-dragging')
  expect(popup.style.getPropertyValue('--overlay-dismiss-distance')).toBe('132px')
})

it('allows dragging the title but leaves form scrolling and close-button taps alone', () => {
  const { change, popup } = setup()
  const title = screen.getByText('Edit record')
  fireEvent.pointerDown(screen.getByText('Scrollable form content'), { clientY: 0, button: 0 })
  fireEvent.pointerMove(popup, { clientY: 200 })
  fireEvent.pointerUp(popup)
  expect(change).not.toHaveBeenCalled()
  expect(popup.setPointerCapture).not.toHaveBeenCalled()
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Close editor' }), { clientY: 0, button: 0 })
  expect(popup.setPointerCapture).not.toHaveBeenCalled()
  fireEvent.pointerDown(title, { clientY: 0, button: 0 })
  fireEvent.pointerMove(popup, { clientY: 150 })
  fireEvent.pointerUp(popup)
  expect(change).toHaveBeenCalledWith(false, expect.anything())
})

it('uses a recent downward flick, but does not dismiss after holding the sheet', () => {
  const { grabber, change, popup } = setup()
  const now = vi.spyOn(performance, 'now')
  now.mockReturnValue(0)
  fireEvent.pointerDown(grabber, { clientY: 0, button: 0 })
  now.mockReturnValue(40)
  fireEvent.pointerMove(popup, { clientY: 50 })
  now.mockReturnValue(200)
  fireEvent.pointerUp(popup)
  expect(change).not.toHaveBeenCalled()
  now.mockReturnValue(300)
  fireEvent.pointerDown(grabber, { clientY: 0, button: 0 })
  now.mockReturnValue(340)
  fireEvent.pointerMove(popup, { clientY: 50 })
  fireEvent.pointerUp(popup)
  expect(change).toHaveBeenCalledWith(false, expect.anything())
  now.mockRestore()
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
