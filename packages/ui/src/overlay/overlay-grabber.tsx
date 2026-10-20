import { Dialog } from '@base-ui/react/dialog'
import { useRef, type PointerEvent } from 'react'

/** Drag dismissal uses the dialog's close path so cancellation and focus restoration still apply. */
export function OverlayGrabber() {
  const close = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ id: number; start: number; offset: number; popup: HTMLElement } | null>(null)

  function reset(event: PointerEvent<HTMLDivElement>, dismiss = false) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null
    current.popup.removeAttribute('data-overlay-dragging')
    current.popup.style.removeProperty('--overlay-drag-offset')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (dismiss && current.offset >= 80) close.current?.click()
  }

  return <>
    <div data-slot="overlay-grabber" aria-hidden="true"
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0 || drag.current) return
        const popup = event.currentTarget.closest<HTMLElement>('[data-slot="dialog-popup"], [data-slot="sheet-popup"]')
        if (!popup) return
        drag.current = { id: event.pointerId, start: event.clientY, offset: 0, popup }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        const current = drag.current
        if (!current || current.id !== event.pointerId) return
        current.offset = Math.max(0, event.clientY - current.start)
        current.popup.setAttribute('data-overlay-dragging', '')
        current.popup.style.setProperty('--overlay-drag-offset', `${current.offset}px`)
      }}
      onPointerUp={event => reset(event, true)}
      onPointerCancel={event => reset(event)}
      onLostPointerCapture={event => reset(event)}
    ><span /></div>
    <Dialog.Close ref={close} hidden tabIndex={-1} aria-hidden="true" />
  </>
}
