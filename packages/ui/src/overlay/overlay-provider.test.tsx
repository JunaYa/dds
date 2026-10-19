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
})
