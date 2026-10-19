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
  return <OverlayContext.Provider value={{ platform, viewport }}>{children}</OverlayContext.Provider>
}

export function useOverlayPresentation() {
  const { platform, viewport } = useContext(OverlayContext)
  return { 'data-overlay-platform': platform, style: viewport }
}
