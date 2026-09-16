import { Icon } from '@iconify/react'
import { AppLogo } from '@vita/brand/react'
import { cn } from '../lib/utils'

export type ToolIconName = 'notion' | 'obsidian' | 'ancher' | 'notebooklm'

const SIMPLE_ICONS = {
  notion: 'simple-icons:notion',
  obsidian: 'simple-icons:obsidian',
  notebooklm: 'material-symbols:book-2-rounded',
} as const

interface ToolIconProps {
  className?: string
  /** Hide from AT (aria-hidden) when a visible tool name sits beside the icon,
   *  so the name isn't announced twice. */
  decorative?: boolean
  name: ToolIconName
  /** Pixel size (square). Defaults to 32. */
  size?: number
  /** Accessible label. Defaults to a capitalized tool name. */
  title?: string
}

const DEFAULT_TITLES: Record<ToolIconName, string> = {
  ancher: 'Ancher',
  notion: 'Notion',
  obsidian: 'Obsidian',
  notebooklm: 'NotebookLM',
}

/**
 * Brand mark for compare / ecosystem surfaces.
 * Notion & Obsidian use simple-icons; Ancher uses the brand symbol.
 */
export function ToolIcon({ name, size = 32, className, title, decorative = false }: ToolIconProps) {
  const label = title ?? DEFAULT_TITLES[name]

  if (name === 'ancher') {
    return (
      <AppLogo
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : label}
        className={cn('shrink-0 text-foreground', className)}
        height={size}
        variant="symbol"
      />
    )
  }

  return (
    <Icon
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={cn(
        'shrink-0',
        name === 'notion' && 'text-foreground',
        name === 'obsidian' && 'text-[#7C3AED]',
        className
      )}
      height={size}
      icon={SIMPLE_ICONS[name]}
      role={decorative ? undefined : 'img'}
      width={size}
    />
  )
}
