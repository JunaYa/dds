import { Sheet, SheetPopup, SheetTitle } from '../sheet/sheet'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OverlayProvider } from './overlay-provider'
import { Dialog, DialogPopup, DialogTitle } from '../dialog/dialog'
import { AlertDialog, AlertDialogPopup, AlertDialogTitle } from '../alert-dialog/alert-dialog'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

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
  render(<OverlayProvider platform="ios"><Dialog open><DialogPopup showGrabber={false}><DialogTitle>Recorder</DialogTitle></DialogPopup></Dialog></OverlayProvider>)
  expect(document.querySelector('[data-slot="overlay-grabber"]')).toBeNull()
})
