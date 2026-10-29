'use client'

import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react'

type Platform = 'default' | 'ios'
const OverlayContext = createContext<{ platform: Platform; viewport?: CSSProperties }>({ platform: 'default' })

export function OverlayProvider({ platform = 'default', children }: { platform?: Platform; children: ReactNode }) {
  const [viewport, setViewport] = useState<CSSProperties>()
  useEffect(() => {
    const visual = window.visualViewport
    if (platform !== 'ios' || !visual) { setViewport(undefined); return }
    const update = () => setViewport({ top: visual.offsetTop, height: visual.height, bottom: 'auto' })
    update()
    visual.addEventListener('resize', update)
    visual.addEventListener('scroll', update)
    return () => {
      visual.removeEventListener('resize', update)
      visual.removeEventListener('scroll', update)
    }
  }, [platform])
  useEffect(() => {
    if (platform !== 'ios') return
    let frame: number | undefined
    const reveal = () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const input = document.activeElement
        if (!(input instanceof HTMLElement) || !input.matches('input, textarea, select, [contenteditable="true"]')) return
        const popup = input.closest<HTMLElement>('[data-slot="dialog-popup"], [data-slot="sheet-popup"]')
        if (!popup) return
        popup.scrollLeft = 0
        const bounds = popup.getBoundingClientRect()
        const header = popup.querySelector<HTMLElement>('[data-slot="dialog-header"], [data-slot="sheet-header"], [data-overlay-drag-region]')
        const footer = popup.querySelector<HTMLElement>('[data-slot="dialog-footer"], [data-slot="sheet-footer"], [data-overlay-footer]')
        const top = Math.max(bounds.top, header?.getBoundingClientRect().bottom ?? bounds.top) + 12
        const bottom = Math.min(bounds.bottom, footer?.getBoundingClientRect().top ?? bounds.bottom) - 12
        if (bottom <= top) return
        const field = input.getBoundingClientRect()
        // Scroll only this popup; scrolling the document shifts the page behind the sheet.
        if (field.bottom > bottom) popup.scrollTop += field.bottom - bottom
        else if (field.top < top) popup.scrollTop -= top - field.top
      })
    }
    reveal()
    document.addEventListener('focusin', reveal)
    return () => {
      document.removeEventListener('focusin', reveal)
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [platform, viewport])
  useEffect(() => {
    if (platform !== 'ios') return
    const constrainHorizontalScroll = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLElement && target.scrollLeft !== 0 &&
          target.matches('[data-slot="dialog-popup"], [data-slot="sheet-popup"], [data-slot="alert-dialog-popup"]')) {
        target.scrollLeft = 0
      }
    }
    document.addEventListener('scroll', constrainHorizontalScroll, true)
    return () => document.removeEventListener('scroll', constrainHorizontalScroll, true)
  }, [platform])
  return <OverlayContext.Provider value={{ platform, viewport }}>{children}</OverlayContext.Provider>
}

export function useOverlayPresentation() {
  const { platform, viewport } = useContext(OverlayContext)
  return { 'data-overlay-platform': platform, style: viewport }
}
