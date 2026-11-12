import { animate, motionValue } from 'motion'
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'

interface PageElasticityProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  enabled?: boolean
  resetKey?: string
}

const excluded = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="dialog"], [role="alertdialog"]'
const returnStiffness = 420
const returnFrequency = Math.sqrt(returnStiffness)

function resist(distance: number, limit: number) {
  return distance * 0.5 / (1 + Math.abs(distance) * 0.5 / limit)
}

function unresist(value: number, limit: number) {
  const magnitude = Math.min(Math.abs(value), limit - 0.001)
  return Math.sign(value) * magnitude / (0.5 * (1 - magnitude / limit))
}

export function PageElasticity({ children, enabled = true, resetKey, ...props }: PageElasticityProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    const scope = element.parentElement ?? element
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const offset = motionValue(0)
    let animation: ReturnType<typeof animate> | undefined
    let gesture: {
      x: number; y: number; lastY: number; distance: number; vertical: boolean
      limit: number; lastTime: number; velocity: number
    } | undefined
    const unsubscribe = offset.on('change', value => {
      element.style.transform = Math.abs(value) < 0.01 ? '' : `translate3d(0, ${value}px, 0)`
    })
    const reset = () => {
      gesture = undefined
      animation?.stop()
      offset.set(0)
    }
    const release = (event: TouchEvent) => {
      const ended = gesture
      if (!ended) return
      gesture = undefined
      animation?.stop()
      if (reduced.matches) offset.set(0)
      else if (offset.get() !== 0) {
        const value = offset.get()
        const direction = Math.sign(value)
        const age = event.timeStamp - ended.lastTime
        const recentVelocity = age >= 0 && age <= 80 ? ended.velocity : 0
        // Bound the initial velocity so the critically damped return stays on
        // this side of rest and inside the remaining pull allowance.
        const inward = -returnFrequency * Math.abs(value) * 0.9
        const outward = Math.min(450, returnFrequency * Math.max(0, ended.limit - Math.abs(value)) * 0.8)
        const velocity = direction * Math.max(inward, Math.min(outward, recentVelocity * direction))
        animation = animate(offset, 0, {
          type: 'spring', stiffness: returnStiffness, damping: 2 * returnFrequency,
          mass: 1, velocity, restDelta: 0.01, restSpeed: 0.5,
        })
      }
    }
    const start = (event: TouchEvent) => {
      gesture = undefined
      const velocity = offset.getVelocity()
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
      const limit = Math.min(40, Math.max(24, window.innerHeight * 0.045))
      gesture = {
        x: touch.clientX, y: touch.clientY, lastY: touch.clientY,
        distance: unresist(current, limit), vertical: Math.abs(current) > 0.01,
        limit, lastTime: event.timeStamp, velocity,
      }
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
      const scroll = document.scrollingElement ?? document.documentElement
      const atTop = scroll.scrollTop <= 1
      const atBottom = scroll.scrollTop + window.innerHeight >= scroll.scrollHeight - 1
      if (gesture.distance !== 0 || (delta > 0 && atTop) || (delta < 0 && atBottom)) {
        const previous = offset.get()
        const direction = Math.sign(gesture.distance || delta)
        gesture.distance = direction * Math.max(0, direction * (gesture.distance + delta))
        const next = resist(gesture.distance, gesture.limit)
        const elapsed = event.timeStamp - gesture.lastTime
        if (elapsed > 0) {
          const instantaneous = elapsed <= 80 ? (next - previous) * 1000 / elapsed : 0
          const weight = 1 - Math.exp(-elapsed / 32)
          gesture.velocity = Math.sign(instantaneous) !== Math.sign(gesture.velocity)
            ? instantaneous
            : gesture.velocity + (instantaneous - gesture.velocity) * weight
        }
        animation?.stop()
        offset.set(next)
      } else {
        gesture.velocity = 0
      }
      gesture.lastTime = event.timeStamp
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
