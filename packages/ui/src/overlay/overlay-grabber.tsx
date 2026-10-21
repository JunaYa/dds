import { Dialog } from '@base-ui/react/dialog'
import { useEffect, useRef } from 'react'

/** Keep dismissal on the dialog's close path, including cancellation and focus restoration. */
export function OverlayGrabber() {
  const close = useRef<HTMLButtonElement>(null)
  const handle = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = handle.current?.closest<HTMLElement>('[data-slot="dialog-popup"], [data-slot="sheet-popup"]')
    if (!parent) return
    const popup = parent
    let drag: { id: number; start: number; offset: number; time: number; velocity: number } | null = null

    function restore() {
      popup.removeAttribute('data-overlay-dragging')
      popup.style.removeProperty('--overlay-drag-offset')
    }
    function start(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || drag || !(event.target instanceof Element)) return
      if (event.target.closest('button, a, input, textarea, select, [role="button"], [contenteditable="true"]')) return
      const region = event.target.closest('[data-slot="overlay-grabber"], [data-slot="dialog-header"], [data-slot="sheet-header"], [data-slot="sheet-title"], [data-overlay-drag-region]')
      if (!region || region.closest('[data-slot="dialog-popup"], [data-slot="sheet-popup"]') !== popup) return
      popup.style.removeProperty('--overlay-dismiss-distance')
      drag = { id: event.pointerId, start: event.clientY, offset: 0, time: performance.now(), velocity: 0 }
      popup.setPointerCapture(event.pointerId)
    }
    function move(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return
      const now = performance.now()
      const offset = Math.max(0, event.clientY - drag.start)
      const elapsed = now - drag.time
      drag.velocity = elapsed > 0 ? (offset - drag.offset) / elapsed : 0
      drag.offset = offset
      drag.time = now
      popup.setAttribute('data-overlay-dragging', '')
      popup.style.setProperty('--overlay-drag-offset', `${offset}px`)
    }
    function finish(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return
      const current = drag
      drag = null
      if (popup.hasPointerCapture(event.pointerId)) popup.releasePointerCapture(event.pointerId)
      const threshold = Math.min(120, Math.max(64, popup.getBoundingClientRect().height * 0.25))
      const flick = current.offset >= 48 && current.velocity >= 0.6 && performance.now() - current.time < 80
      if (event.type === 'pointerup' && (current.offset >= threshold || flick)) {
        // Preserve the current painted position until the ending style takes over.
        popup.style.setProperty('--overlay-dismiss-distance', `${Math.max(popup.getBoundingClientRect().height, current.offset) + 32}px`)
        close.current?.click()
      }
      restore()
    }
    popup.addEventListener('pointerdown', start)
    popup.addEventListener('pointermove', move)
    popup.addEventListener('pointerup', finish)
    popup.addEventListener('pointercancel', finish)
    popup.addEventListener('lostpointercapture', finish)
    return () => {
      popup.removeEventListener('pointerdown', start)
      popup.removeEventListener('pointermove', move)
      popup.removeEventListener('pointerup', finish)
      popup.removeEventListener('pointercancel', finish)
      popup.removeEventListener('lostpointercapture', finish)
      restore()
      popup.style.removeProperty('--overlay-dismiss-distance')
    }
  }, [])

  return <>
    <div ref={handle} data-slot="overlay-grabber" aria-hidden="true"><span /></div>
    <Dialog.Close ref={close} hidden tabIndex={-1} aria-hidden="true" />
  </>
}
