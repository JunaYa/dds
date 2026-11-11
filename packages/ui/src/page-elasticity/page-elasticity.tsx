import { animate, motionValue } from 'motion'
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'

interface PageElasticityProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  enabled?: boolean
  resetKey?: string
}

const excluded = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="dialog"], [role="alertdialog"]'

export function PageElasticity({ children, enabled = true, resetKey, ...props }: PageElasticityProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    const scope = element.parentElement ?? element
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const offset = motionValue(0)
    let animation: ReturnType<typeof animate> | undefined
    let gesture: { x: number; y: number; lastY: number; distance: number; vertical: boolean } | undefined
    const unsubscribe = offset.on('change', value => {
      element.style.transform = Math.abs(value) < 0.01 ? '' : `translate3d(0, ${value}px, 0)`
    })
    const reset = () => {
      gesture = undefined
      animation?.stop()
      offset.set(0)
    }
    const release = () => {
      gesture = undefined
      animation?.stop()
      if (reduced.matches) offset.set(0)
      else if (offset.get() !== 0) animation = animate(offset, 0, { type: 'spring', visualDuration: 0.22, bounce: 0 })
    }
    const start = (event: TouchEvent) => {
      gesture = undefined
      animation?.stop()
      if (reduced.matches || event.touches.length !== 1 || !(event.target instanceof Element)) { reset(); return }
      if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01) { reset(); return }
      if (event.target.closest(excluded) || document.activeElement?.matches(excluded)) { reset(); return }
      if (document.getSelection()?.isCollapsed === false) { reset(); return }
      // Inner scrollers keep their own edge and gesture behavior.
      for (let node: Element | null = event.target; node && node !== scope; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (/(auto|scroll)/.test(`${style.overflowY} ${style.overflowX}`)) { reset(); return }
      }
      const touch = event.touches[0]
      const current = offset.get()
      const distance = Math.sign(current) * -100 * Math.log(1 - Math.min(Math.abs(current), 17.999) / 18)
      gesture = { x: touch.clientX, y: touch.clientY, lastY: touch.clientY, distance, vertical: false }
    }
    const move = (event: TouchEvent) => {
      if (!gesture) return
      if (event.touches.length !== 1 || reduced.matches) { reset(); return }
      const touch = event.touches[0]
      const dx = touch.clientX - gesture.x
      const dy = touch.clientY - gesture.y
      if (!gesture.vertical) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return
        if (Math.abs(dx) >= Math.abs(dy)) { reset(); return }
        gesture.vertical = true
      }
      const delta = touch.clientY - gesture.lastY
      gesture.lastY = touch.clientY
      if (gesture.distance * delta < 0) { release(); return }
      const scroll = document.scrollingElement ?? document.documentElement
      const atTop = scroll.scrollTop <= 1
      const atBottom = scroll.scrollTop + window.innerHeight >= scroll.scrollHeight - 1
      if ((delta > 0 && atTop) || (delta < 0 && atBottom)) {
        gesture.distance += delta
        animation?.stop()
        offset.set(Math.sign(gesture.distance) * 18 * (1 - Math.exp(-Math.abs(gesture.distance) / 100)))
      } else if (gesture.distance !== 0) {
        release()
      }
    }
    scope.addEventListener('touchstart', start, { passive: true })
    scope.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', release, { passive: true })
    window.addEventListener('touchcancel', reset, { passive: true })
    window.addEventListener('blur', reset)
    window.addEventListener('resize', reset)
    window.addEventListener('keydown', reset)
    document.addEventListener('visibilitychange', reset)
    window.visualViewport?.addEventListener('resize', reset)
    reduced.addEventListener('change', reset)
    return () => {
      reset()
      unsubscribe()
      offset.destroy()
      scope.removeEventListener('touchstart', start)
      scope.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', release)
      window.removeEventListener('touchcancel', reset)
      window.removeEventListener('blur', reset)
      window.removeEventListener('resize', reset)
      window.removeEventListener('keydown', reset)
      document.removeEventListener('visibilitychange', reset)
      window.visualViewport?.removeEventListener('resize', reset)
      reduced.removeEventListener('change', reset)
    }
  }, [enabled, resetKey])

  return <div data-slot="page-elasticity" className="overflow-clip"><div {...props} ref={ref}>{children}</div></div>
}
