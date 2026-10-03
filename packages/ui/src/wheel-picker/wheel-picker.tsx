import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react'
import { cn } from '../lib/utils'
import './wheel-picker.css'

export type WheelOption = { value: string; label: string }
const rowHeight = 32

export function WheelPicker({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  className,
  ref: forwardedRef,
  onKeyDown,
  onScroll,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'defaultValue' | 'onChange'> & {
  label: string
  options: WheelOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
}) {
  const [internal, setInternal] = useState(
    defaultValue ?? options[0]?.value ?? ''
  )
  const selected = value ?? internal
  function change(next: string) {
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }
  const ref = useRef<HTMLDivElement>(null)
  const position = useRef(-1)
  const index = Math.max(
    0,
    options.findIndex((item) => item.value === selected)
  )
  useLayoutEffect(() => {
    if (ref.current && position.current !== index) {
      ref.current.scrollTop = index * rowHeight
      position.current = index
    }
  }, [index, options])
  if (!options.length) return null
  return (
    <div
      {...props}
      ref={(node) => {
        ref.current = node
        if (typeof forwardedRef === 'function') return forwardedRef(node)
        if (forwardedRef) forwardedRef.current = node
      }}
      className={cn('ui-wheel-picker', className)}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={index}
      aria-valuemin={0}
      aria-valuemax={options.length - 1}
      aria-valuetext={options[index].label}
      onScroll={(event) => {
        onScroll?.(event)
        if (event.defaultPrevented) return
        const next = Math.max(
          0,
          Math.min(
            options.length - 1,
            Math.round(event.currentTarget.scrollTop / rowHeight)
          )
        )
        if (position.current !== next) {
          position.current = next
          change(options[next].value)
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        const delta = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[
          event.key
        ]
        if (delta === undefined && event.key !== 'Home' && event.key !== 'End')
          return
        event.preventDefault()
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? options.length - 1
              : Math.max(0, Math.min(options.length - 1, index + (delta ?? 0)))
        change(options[next].value)
      }}
    >
      {options.map((option) => (
        <div
          className="ui-wheel-option"
          key={option.value}
          aria-hidden="true"
          onClick={() => change(option.value)}
        >
          {option.label}
        </div>
      ))}
    </div>
  )
}
