import { Sheet, SheetPopup, SheetTitle } from '../sheet/sheet'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OverlayProvider } from './overlay-provider'
import { Dialog, DialogPopup, DialogTitle } from '../dialog/dialog'
import { AlertDialog, AlertDialogPopup, AlertDialogTitle } from '../alert-dialog/alert-dialog'
import { Textarea } from '../textarea/textarea'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('rejects focus-induced horizontal offsets without changing vertical scrolling', () => {
  render(<OverlayProvider platform="ios"><Dialog open><DialogPopup><DialogTitle>Edit</DialogTitle></DialogPopup></Dialog></OverlayProvider>)
  const popup = screen.getByRole('dialog')
  popup.scrollTop = 90
  popup.scrollLeft = 160
  fireEvent.scroll(popup)
  expect(popup.scrollLeft).toBe(0)
  expect(popup.scrollTop).toBe(90)
})

it('propagates iOS presentation through dialog and alert portals', () => {
  render(<OverlayProvider platform="ios">
    <Dialog open><DialogPopup><DialogTitle>Edit record</DialogTitle></DialogPopup></Dialog>
    <AlertDialog open><AlertDialogPopup><AlertDialogTitle>Discard?</AlertDialogTitle></AlertDialogPopup></AlertDialog>
  </OverlayProvider>)
  expect(document.querySelector('[data-slot="dialog-viewport"]')).toHaveAttribute('data-overlay-platform', 'ios')
  expect(document.querySelector('[data-slot="alert-dialog-viewport"]')).toHaveAttribute('data-overlay-platform', 'ios')
  expect(document.querySelector('[data-slot="dialog-backdrop"]')).toHaveAttribute('data-overlay-platform', 'ios')
  expect(document.querySelector('[data-slot="dialog-popup"] [data-slot="overlay-grabber"]')).not.toBeNull()
  expect(document.querySelector('[data-slot="alert-dialog-popup"] [data-slot="overlay-grabber"]')).toBeNull()
})

it('tracks the visible viewport when the keyboard opens and removes subscriptions', () => {
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0 })
  const remove = vi.spyOn(viewport, 'removeEventListener')
  vi.stubGlobal('visualViewport', viewport)
  const { unmount } = render(<OverlayProvider platform="ios">
    <Dialog open><DialogPopup><DialogTitle>Edit record</DialogTitle></DialogPopup></Dialog>
  </OverlayProvider>)
  const container = document.querySelector('[data-slot="dialog-viewport"]')
  expect(container).toHaveStyle({ height: '800px' })
  act(() => { viewport.height = 430; viewport.offsetTop = 12; viewport.dispatchEvent(new Event('resize')) })
  expect(container).toHaveStyle({ height: '430px', top: '12px' })
  unmount()
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
})

it('leaves desktop layout to existing styles', () => {
  render(<OverlayProvider><Dialog open><DialogPopup><DialogTitle>Edit record</DialogTitle></DialogPopup></Dialog></OverlayProvider>)
  const container = document.querySelector('[data-slot="dialog-viewport"]')
  expect(container).toHaveAttribute('data-overlay-platform', 'default')
  expect(container).not.toHaveAttribute('style')
  expect(document.querySelector('[data-slot="overlay-grabber"]')).toBeNull()
})


it.each(['left', 'right', 'top', 'bottom'] as const)('preserves the requested %s sheet direction on iOS', side => {
  render(<OverlayProvider platform="ios"><Sheet open>
    <SheetPopup side={side}><SheetTitle>Actions</SheetTitle></SheetPopup>
  </Sheet></OverlayProvider>)
  expect(document.querySelector('[data-slot="sheet-viewport"]')).toHaveAttribute('data-side', side)
  expect(Boolean(document.querySelector('[data-slot="overlay-grabber"]'))).toBe(side === 'bottom')
})

it('can omit the grabber for full-screen flows on iOS', () => {
  render(<OverlayProvider platform="ios"><Dialog open><DialogPopup showGrabber={false} viewportProps={{ 'data-overlay-fullscreen': '', className: 'full-screen' }}><DialogTitle>Recorder</DialogTitle></DialogPopup></Dialog></OverlayProvider>)
  expect(document.querySelector('[data-slot="overlay-grabber"]')).toBeNull()
  expect(document.querySelector('[data-slot="dialog-viewport"]')).toHaveAttribute('data-overlay-fullscreen')
  expect(document.querySelector('[data-slot="dialog-viewport"]')).toHaveClass('full-screen')
})

it('reveals the focused field above a sticky action bar without scrolling the document', () => {
  let paint: FrameRequestCallback | undefined
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { paint = callback; return 1 }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  render(<OverlayProvider platform="ios"><Dialog open><DialogPopup>
    <DialogTitle>Edit</DialogTitle><Textarea aria-label="Notes" />
    <div data-overlay-footer>Save</div>
  </DialogPopup></Dialog></OverlayProvider>)
  const popup = screen.getByRole('dialog')
  const input = screen.getByLabelText('Notes')
  const footer = popup.querySelector<HTMLElement>('[data-overlay-footer]')!
  vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 500 } as DOMRect)
  vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue({ top: 400, bottom: 500 } as DOMRect)
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ top: 380, bottom: 460 } as DOMRect)
  input.focus()
  act(() => paint?.(0))
  expect(popup.scrollTop).toBe(72)
  expect(document.documentElement.scrollTop).toBe(0)
})
