import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './toast.css'

export function Toast({ children, onDismiss, duration = 5000 }: {
  children: ReactNode
  onDismiss: () => void
  duration?: number
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [duration, onDismiss])

  return createPortal(
    <div className="vita-toast-region">
      <div className="vita-toast" role="status" aria-live="polite" aria-atomic="true">
        {children}
      </div>
    </div>,
    document.body,
  )
}
