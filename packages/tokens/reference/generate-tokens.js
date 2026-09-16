#!/usr/bin/env node

/**
 * Generate CSS from Design Tokens
 *
 * This script dynamically generates CSS files from tokens.json.
 * It automatically adapts to changes in the token file:
 *
 * ✅ What you CAN change in tokens.json:
 *    - Add/remove/modify token values
 *    - Add/remove token categories (e.g., new color scales)
 *    - Add new collections in $collections
 *    - Add/modify modes in $collections (e.g., Light, Dark, HighContrast)
 *    - Change collection order, names, and descriptions
 *    - Add tokens to existing collections
 *
 * 🔧 What the script does automatically:
 *    - Reads $collections metadata to discover all collections
 *    - Generates separate CSS files for each collection
 *    - Creates @theme inline blocks for collections with multiple modes
 *    - Handles single-mode (Default) and multi-mode (Light/Dark) collections
 *    - Resolves token references ({primitives.zinc.50} -> var(--color-zinc-50))
 *    - Sorts collections by order property
 *    - Preserves opacity from styles.json (if present) using color-mix()
 *
 * 🎨 Opacity Handling:
 *    If styles.json contains Figma style exports with opacity < 1, they are
 *    automatically converted to CSS color-mix() for semantic tokens:
 *      Example: opacity 0.4 -> color-mix(in srgb, var(--color), transparent 60%)
 *
 *    The opacity lookup is generic and searches through ALL paint categories
 *    in styles.json, not hardcoded to specific paths. Any token with opacity
 *    will be preserved regardless of its location in the styles structure.
 *
 * 📦 Output: Generates CSS files in src/styles/tokens/test/
 *    - {collection}.css for each collection in $collections
 *    - primitives.css, abstractions.css, semantics.css
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read tokens and styles
const tokensPath = join(rootDir, 'src/tokens.json')
const stylesPath = join(rootDir, 'src/styles.json')
const tokens = JSON.parse(readFileSync(tokensPath, 'utf-8'))
const styles = JSON.parse(readFileSync(stylesPath, 'utf-8'))

// Get collections and modes from metadata
const collections = tokens.$collections || {}
const collectionNames = Object.keys(collections).sort((a, b) => {
  return (collections[a].order || 999) - (collections[b].order || 999)
})

/**
 * Build a lookup map of all tokens with opacity from styles.json
 * Returns a Map: tokenName -> opacity value
 *
 * This function recursively traverses the entire styles.json structure
 * and extracts opacity values from tokens in their OWN style definitions.
 *
 * Important: Figma exports multiple styles that USE the same token:
 * Example for "accent/status/danger/rest" token:
 * - accent/danger/10 style: uses the token at 10% opacity (utility style)
 * - accent/danger/20 style: uses the token at 20% opacity (utility style)
 * - accent/danger/rest style: uses the token at 100% opacity (ACTUAL token style)
 *
 * Solution: Only use opacity from styles where the PATH matches the TOKEN name
 * - Path: "accent/danger/rest" → Token: "accent/status/danger/rest" → MATCH! Use this opacity
 * - Path: "accent/danger/10" → Token: "accent/status/danger/rest" → No match, skip
 *
 * Note: Token names have "status" but paths don't, so we normalize both before comparing.
 */
function buildOpacityLookupMap() {
  const opacityMap = new Map()

  if (!styles?.styles?.paint) {
    return opacityMap
  }

  // Recursively traverse the paint styles structure
  function traverse(obj, path = []) {
    if (!obj || typeof obj !== 'object') {
      return
    }

    // Check if this is a style node with 'value' array
    if (Array.isArray(obj.value) && obj.id) {
      for (const fill of obj.value) {
        // Found a fill with opacity
        if (fill.opacity !== undefined) {
          const fillOpacity = fill.opacity

          // Check gradient stops for bound variables
          if (Array.isArray(fill.gradientStops)) {
            for (const stop of fill.gradientStops) {
              if (stop.boundVariable?.variableName) {
                const tokenName = stop.boundVariable.variableName
                const stylePath = path.join('/')

                // Normalize both for comparison:
                // Token: "accent/status/danger/rest" → "accent/danger/rest"
                // Token: "shadcn/muted-foreground" → "shadcn/muted-foreground"
                // Path: "semantics/accent/danger/rest" → "accent/danger/rest" (strip collection)
                // Path: "semantics/shadcn/muted-foreground" → "shadcn/muted-foreground" (strip collection)
                const normalizedToken = tokenName.replace('/status/', '/')
                // Remove collection prefix (semantics/, abstractions/, primitives/) from path
                const normalizedPath = stylePath.replace(
                  /^(semantics|abstractions|primitives)\//,
                  ''
                )

                // Only use opacity if the path matches the token
                // This filters out utility styles (10, 20, etc.) and only keeps the actual token style
                if (normalizedPath === normalizedToken) {
                  // Only store if opacity < 1 (100% opaque tokens don't need color-mix)
                  if (fillOpacity < 1) {
                    // Store with dashes to match CSS token names
                    // Convert "shadcn/muted-foreground" -> "shadcn-muted-foreground"
                    const cssTokenName = tokenName.replace(/\//g, '-')
                    opacityMap.set(cssTokenName, fillOpacity)
                  }
                }
              }
            }
          }
          // Also check direct boundVariable (for solid fills)
          if (fill.boundVariable?.variableName) {
            const tokenName = fill.boundVariable.variableName
            const stylePath = path.join('/')

            const normalizedToken = tokenName.replace('/status/', '/')
            // Remove collection prefix (semantics/, abstractions/, primitives/) from path
            const normalizedPath = stylePath.replace(/^(semantics|abstractions|primitives)\//, '')

            if (normalizedPath === normalizedToken && fillOpacity < 1) {
              // Store with dashes to match CSS token names
              // Convert "shadcn/muted-foreground" -> "shadcn-muted-foreground"
              const cssTokenName = tokenName.replace(/\//g, '-')
              opacityMap.set(cssTokenName, fillOpacity)
            }
          }
        }
      }
    }

    // Recursively traverse nested objects
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object') {
        traverse(obj[key], [...path, key])
      }
    }
  }

  traverse(styles.styles.paint)

  return opacityMap
}

// Build the opacity lookup map once at module load time
const opacityLookupMap = buildOpacityLookupMap()

/**
 * Get opacity from styles.json for a semantic token
 * Returns opacity value (0-1) or null if not found or opacity is 1
 *
 * This function uses a pre-built lookup map that contains ALL tokens
 * with opacity from styles.json, regardless of their category or path.
 *
 * Token name format in styles.json uses "/" as separator but is stored
 * in the opacity map with "-" separator to match CSS token names:
 * - "shadcn/muted-foreground" -> "shadcn-muted-foreground"
 * - "accent/status/danger/disabled" -> "accent-status-danger-disabled"
 * - "background/glass/rest" -> "background-glass-rest"
 *
 * Token name format received as parameter already uses "-" separator:
 * - "shadcn-muted-foreground"
 * - "accent-status-danger-disabled"
 * - "background-glass-rest"
 */
function getOpacityFromStyles(tokenName) {
  // Token name is already in CSS format (dashes), look it up directly
  const opacity = opacityLookupMap.get(tokenName)

  return opacity !== undefined ? opacity : null
}

/**
 * Get the type of a referenced token by looking it up in tokens.json
 */
function getReferencedTokenType(reference) {
  const path = reference.replace(/[{}]/g, '')
  const parts = path.split('.')

  let current = tokens.tokens
  for (const part of parts) {
    if (!current?.[part]) {
      return null
    }
    current = current[part]
  }

  return current?.type || null
}

/**
 * Convert token reference to CSS variable reference
 * Respects the multi-layer token system with proper mapping relationships:
 *
 * {primitives.color.white.50} -> var(--color-white-50)
 * {primitives.color.tailwind.zinc.50} -> var(--color-tailwind-zinc-50)
 * {primitives.color.radix.mauve.light.1} -> var(--color-surface-mauve-light-1)
 * {primitives.radius.12} -> var(--radius-12)
 * {primitives.zIndex.0} -> var(--z-zIndex-0)
 * {abstractions.surface.50} -> var(--color-surface-50)
 * {semantics.background} -> var(--background)
 *
 * For semantic tokens with opacity, wraps in color-mix():
 * var(--background) with 90% opacity -> color-mix(in srgb, var(--background), transparent 10%)
 */
function tokenReferenceToCSSVar(reference, tokenName = null, applyOpacity = false) {
  if (!reference.includes('{')) {
    return reference // Not a reference, return as-is
  }

  const path = reference.replace(/[{}]/g, '')
  const parts = path.split('.')
  const collection = parts[0] // primitives, abstractions, semantics

  // For semantics, no prefix, just use the token path
  if (collection === 'semantics') {
    let tokenPath = parts.slice(1).join('-')

    // Remove 'shadcn-' prefix for shadcn compatibility
    // shadcn components expect --background, not --shadcn-background
    if (tokenPath.startsWith('shadcn-')) {
      tokenPath = tokenPath.replace('shadcn-', '')
    }

    const varReference = `var(--${tokenPath})`

    // Apply opacity if requested
    if (applyOpacity && tokenName) {
      const opacity = getOpacityFromStyles(tokenName)
      if (opacity !== null) {
        const transparencyPercent = Math.round((1 - opacity) * 100)
        return `color-mix(in srgb, ${varReference}, transparent ${transparencyPercent}%)`
      }
    }

    return varReference
  }

  // For primitives and abstractions, we need to determine the correct prefix
  // based on the token's category and type

  // Get the referenced token's type
  const tokenType = getReferencedTokenType(reference)

  // Build the token path (everything after collection name)
  let tokenPath = parts.slice(1).join('-')

  // Determine prefix based on token category and type
  let prefix

  // Check for specific category paths first
  if (parts[1] === 'color') {
    // Color tokens: primitives.color.{category}.{name}
    const colorCategory = parts[2] // white, black, tailwind, radix

    if (colorCategory === 'radix') {
      // Radix colors get surface prefix: primitives.color.radix.mauve.light.1 -> color-surface-mauve-light-1
      prefix = 'color-surface'
      tokenPath = parts.slice(3).join('-') // Skip 'color' and 'radix'
    } else if (colorCategory === 'tailwind') {
      // Tailwind colors: primitives.color.tailwind.zinc.50 -> color-tailwind-zinc-50
      prefix = 'color-tailwind'
      tokenPath = parts.slice(3).join('-') // Skip 'color' and 'tailwind'
    } else if (colorCategory === 'white' || colorCategory === 'black') {
      // White/black: primitives.color.white.50 -> color-white-50
      prefix = 'color'
      tokenPath = parts.slice(2).join('-') // Skip 'color' only
    } else {
      // Other color tokens
      prefix = 'color'
      tokenPath = parts.slice(2).join('-') // Skip 'color'
    }
  } else if (parts[1] === 'zIndex') {
    // zIndex tokens: primitives.zIndex.0 -> z-zIndex-0
    prefix = 'z'
    tokenPath = parts.slice(1).join('-') // Keep 'zIndex' in the name
  } else if (parts[1] === 'radius') {
    // Radius tokens: primitives.radius.12 -> radius-12
    prefix = 'radius'
    tokenPath = parts.slice(2).join('-') // Skip 'radius'
  } else if (parts[1] === 'spacing') {
    // Spacing tokens: primitives.spacing.4 -> spacing-4
    prefix = 'spacing'
    tokenPath = parts.slice(2).join('-') // Skip 'spacing'
  } else if (parts[1] === 'motion') {
    // Motion/duration tokens: primitives.motion.duration.250 -> duration-motion-duration-250
    prefix = 'duration'
    tokenPath = parts.slice(1).join('-') // Keep full path
  } else {
    // Fall back to type-based prefix for abstractions or unknown categories
    prefix = getPrefixForType(tokenType, tokenPath)

    // For abstractions, the path might already include category info
    // Don't strip it unless it's redundant with the prefix
    if (collection === 'abstractions') {
      // Keep the full path for abstractions
      tokenPath = parts.slice(1).join('-')
    }
  }

  // Build the variable reference
  const varReference = `var(--${prefix}-${tokenPath})`

  // Apply opacity if requested
  if (applyOpacity && tokenName) {
    const opacity = getOpacityFromStyles(tokenName)
    if (opacity !== null) {
      const transparencyPercent = Math.round((1 - opacity) * 100)
      return `color-mix(in srgb, ${varReference}, transparent ${transparencyPercent}%)`
    }
  }

  return varReference
}

/**
 * Resolve token reference like {primitives.zinc.50}
 * Used only for primitives (which have no references)
 */
function resolveTokenReference(reference, allTokens, mode) {
  const path = reference.replace(/[{}]/g, '')
  const parts = path.split('.')

  let current = allTokens
  for (const part of parts) {
    if (!current?.[part]) {
      console.warn(`Token reference not found: ${reference}`)
      return reference
    }
    current = current[part]
  }

  if (typeof current === 'object' && current !== null) {
    if (current.modes && mode) {
      const modeValue = current.modes[mode]
      if (typeof modeValue === 'string' && modeValue.includes('{')) {
        return resolveTokenReference(modeValue, allTokens, mode)
      }
      return modeValue
    }
    if (current.value !== undefined) {
      const value = current.value
      if (typeof value === 'string' && value.includes('{')) {
        return resolveTokenReference(value, allTokens, mode)
      }
      return value
    }
  }

  return current
}

/**
 * Get tokens for a collection (with CSS var references for non-primitives)
 * Returns both the resolved values and their types
 */
function getResolvedTokens(collection, mode) {
  const resolved = {}
  const tokenTypes = {} // Track token types for proper prefix generation
  const tokenGroup = tokens.tokens[collection]
  const isPrimitives = collection === 'primitives'
  const isSemantics = collection === 'semantics'

  function flattenTokens(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const tokenPath = prefix ? `${prefix}-${key}` : key

      if (value && typeof value === 'object') {
        if ('type' in value && value.collection === collection) {
          // Store the token type for prefix generation
          tokenTypes[tokenPath] = value.type

          if (value.modes && mode) {
            const modeValue = value.modes[mode]
            if (typeof modeValue === 'string') {
              // For semantic tokens, convert references to CSS vars with opacity support
              resolved[tokenPath] =
                modeValue.includes('{') && !isPrimitives
                  ? tokenReferenceToCSSVar(modeValue, tokenPath, isSemantics)
                  : modeValue.includes('{')
                    ? resolveTokenReference(modeValue, tokens.tokens, mode)
                    : modeValue
            }
          } else if (value.value !== undefined) {
            const val = value.value
            // For abstractions, convert references to CSS vars
            // For primitives, resolve to actual values
            if (typeof val === 'string' && val.includes('{')) {
              resolved[tokenPath] = isPrimitives
                ? resolveTokenReference(val, tokens.tokens, mode)
                : tokenReferenceToCSSVar(val, tokenPath, isSemantics)
            } else {
              resolved[tokenPath] = String(val)
            }
          }
        } else if (!('type' in value)) {
          flattenTokens(value, tokenPath)
        }
      }
    }
  }

  flattenTokens(tokenGroup)
  return { resolved, tokenTypes }
}

/**
 * Get CSS variable prefix based on token type and name
 */
function getPrefixForType(tokenType, tokenName = '') {
  const typeMap = {
    color: 'color',
    spacing: 'spacing',
    sizing: 'size',
    borderRadius: 'radius',
  }

  // Check token name patterns for special categories
  const nameLower = tokenName.toLowerCase()

  // Radix surface colors (gray, mauve, slate, sage, olive, sand)
  if (nameLower.includes('radix-')) {
    return 'color-surface'
  }

  // Tailwind colors remain as default color tokens
  if (nameLower.includes('tailwind-')) {
    return 'color'
  }

  // Duration tokens (motion/animation)
  if (nameLower.includes('duration') || tokenType === 'duration') {
    return 'duration'
  }

  // Gap tokens
  if (nameLower.startsWith('gap-')) {
    return 'gap'
  }

  // Gutter tokens
  if (nameLower.startsWith('gutter-')) {
    return 'gutter'
  }

  // Margin tokens
  if (nameLower.startsWith('margin-')) {
    return 'margin'
  }

  // Rounded tokens
  if (nameLower.startsWith('rounded-')) {
    return 'rounded'
  }

  // Z-index tokens
  if (nameLower.startsWith('z-layer') || nameLower.startsWith('z-index')) {
    return 'z'
  }

  // Font type scale size tokens
  if (nameLower.includes('font-type-scale') && nameLower.includes('size')) {
    return 'font-size'
  }

  // Font type scale line-height tokens
  if (nameLower.includes('font-type-scale') && nameLower.includes('line-height')) {
    return 'line-height'
  }

  return typeMap[tokenType] || 'color'
}

/**
 * Generate CSS variables with type-appropriate prefixes
 */
function generateCSSVariables(collection, mode) {
  const { resolved, tokenTypes } = getResolvedTokens(collection, mode)
  const cssVars = []

  for (const [key, value] of Object.entries(resolved)) {
    let varName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    const tokenType = tokenTypes[key]
    const prefix = getPrefixForType(tokenType, varName)

    // For semantics collection, no prefix needed
    if (collection === 'semantics') {
      // Remove 'shadcn-' prefix for shadcn compatibility
      // shadcn components expect --background, not --shadcn-background
      if (varName.startsWith('shadcn-')) {
        varName = varName.replace('shadcn-', '')
      }
      cssVars.push(`  --${varName}: ${value};`)
    } else {
      // Remove redundant category prefix from token name to avoid duplication
      // Handle special prefixes that contain hyphens
      if (prefix === 'color-surface') {
        // For radix surface colors: radix-mauve-light-1 -> mauve-light-1
        varName = varName.replace('color-radix-', '')
      } else if (prefix !== 'color') {
        // For non-color tokens (e.g., "rounded-none" instead of "rounded-rounded-none")
        const prefixPattern = `${prefix}-`
        if (varName.startsWith(prefixPattern)) {
          varName = varName.substring(prefixPattern.length)
        }
      } else {
        // For color tokens, remove the color- prefix if present
        if (varName.startsWith('color-')) {
          varName = varName.substring('color-'.length)
        }
      }

      // Also handle legacy patterns
      if (varName.startsWith('spacing-')) {
        varName = varName.replace('spacing-', '')
      } else if (varName.startsWith('sizes-')) {
        varName = varName.replace('sizes-', '')
      } else if (varName.startsWith('radius-')) {
        varName = varName.replace('radius-', '')
      }

      cssVars.push(`  --${prefix}-${varName}: ${value};`)
    }
  }

  return cssVars.join('\n')
}

/**
 * Generate @theme inline block for Tailwind CSS
 * Makes tokens available as utility classes
 * Works for semantics (with modes) and abstractions/primitives (single mode)
 *
 * For semantics collection, auto-detects all CSS variables from the generated
 * :root selector and creates corresponding --color-* mappings for Tailwind
 */
function generateTailwindThemeInline(collectionName) {
  const collectionMeta = collections[collectionName]
  if (!(collectionMeta && collectionMeta.modes) || collectionMeta.modes.length === 0) {
    return ''
  }

  // Use first mode to get token keys
  const firstMode = collectionMeta.modes[0]
  const { resolved, tokenTypes } = getResolvedTokens(collectionName, firstMode)
  const themeVars = []

  // For semantics, we'll auto-detect all variables after generating them
  if (collectionName === 'semantics') {
    // Generate the CSS variables first to see what we have
    const cssVarsString = generateCSSVariables(collectionName, firstMode)

    // Extract all variable names using regex: --variable-name: value;
    const varNameRegex = /--([a-z0-9-]+):/g
    const varNames = new Set()
    let match

    while ((match = varNameRegex.exec(cssVarsString)) !== null) {
      varNames.add(match[1]) // Add the variable name (without --)
    }

    // Generate @theme entries for all detected variables
    for (const varName of Array.from(varNames).sort()) {
      themeVars.push(`  --color-${varName}: var(--${varName});`)
    }
  } else {
    // For primitives and abstractions, use the original logic
    for (const key of Object.keys(resolved)) {
      let varName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      const tokenType = tokenTypes[key]
      const prefix = getPrefixForType(tokenType, varName)

      // For primitives, only include borderRadius tokens
      // Skip colors (too many tokens), spacing, and sizing
      if (collectionName === 'primitives' && tokenType !== 'borderRadius') {
        continue
      }

      // Remove redundant category prefix from token name to avoid duplication
      // Only for non-color tokens
      if (prefix !== 'color') {
        const prefixPattern = `${prefix}-`
        if (varName.startsWith(prefixPattern)) {
          varName = varName.substring(prefixPattern.length)
        }
      }

      // Also handle legacy patterns
      if (varName.startsWith('spacing-')) {
        varName = varName.replace('spacing-', '')
      } else if (varName.startsWith('sizes-')) {
        varName = varName.replace('sizes-', '')
      } else if (varName.startsWith('radius-')) {
        varName = varName.replace('radius-', '')
      }

      // For abstractions and primitives, use the appropriate prefix
      const cssVar = `--${prefix}-${varName}`
      themeVars.push(`  ${cssVar}: var(${cssVar});`)
    }
  }

  if (themeVars.length === 0) {
    return ''
  }

  const description = collectionMeta.description || `${collectionMeta.name} tokens`
  return `/* Tailwind CSS Theme - ${description} */\n@theme inline {\n${themeVars.join('\n')}\n}\n`
}

/**
 * Generate responsive typography CSS with media queries
 * Extracts typography tokens from the responsive collection and generates
 * mobile-first CSS with all Tailwind breakpoints (xs, sm, md, lg, xl)
 * Supports global typography scaling via --typography-scale variable
 *
 * Window-Responsive Typography:
 * In addition to viewport-based media queries, this also generates data-attribute
 * selectors for window-responsive typography. This allows typography to scale
 * based on individual window sizes, not just the viewport size.
 *
 * Breakpoint Mapping:
 * - xs (< 640px) → mobile (min) mode
 * - sm (640-767px) → tablet (sm) mode
 * - md (768-1023px) → desktop (md) mode
 * - lg (1024-1279px) → desktop (md) mode (reused)
 * - xl (≥ 1280px) → desktop (md) mode (reused)
 *
 * Usage:
 * 1. Window content div should have data-window-size attribute (xs/sm/md/lg/xl)
 * 2. ResizeObserver in WindowFrame watches width and updates attribute
 * 3. Typography scales independently for each window
 */
function generateResponsiveTypographyCSS() {
  const responsiveCollection = tokens.tokens?.responsive
  if (!responsiveCollection?.typography) {
    console.warn('⚠️  No typography tokens found in responsive collection')
    return ''
  }

  const typography = responsiveCollection.typography
  const scales = Object.keys(typography)

  // Define breakpoint configurations
  // Maps our 5 breakpoints to the 3 available token modes
  // lg and xl reuse md (desktop) values - no need for extra scaling
  const breakpoints = [
    {
      name: 'xs',
      mode: 'mobile (min)',
      minWidth: null,
      description: 'Extra small (< 640px / mobile)',
    },
    {
      name: 'sm',
      mode: 'tablet (sm)',
      minWidth: '40rem',
      description: 'Small (640px+ / tablet portrait)',
    },
    {
      name: 'md',
      mode: 'desktop (md)',
      minWidth: '48rem',
      description: 'Medium (768px+ / tablet landscape)',
    },
    {
      name: 'lg',
      mode: 'desktop (md)',
      minWidth: '64rem',
      description: 'Large (1024px+ / desktop)',
    },
    {
      name: 'xl',
      mode: 'desktop (md)',
      minWidth: '80rem',
      description: 'Extra large (1280px+ / large desktop)',
    },
  ]

  let css = `/* =====================================================
   Typography - Responsive Type Scale
   DO NOT EDIT THIS FILE DIRECTLY
   Edit tokens.json and regenerate using npm run tokens
   ===================================================== */

/* Responsive Typography System
   Based on iOS/macOS Human Interface Guidelines
   Mobile-first with all Tailwind breakpoints (xs, sm, md, lg, xl)
   Supports both viewport-based (media queries) and window-based (data attributes)
   Supports global typography scaling via --typography-scale variable */

/* Define custom properties for typography tokens */
:root {
`

  // Generate base (xs/mobile) values
  for (const scale of scales) {
    const scaleData = typography[scale]
    if (!scaleData) continue

    // Font size
    if (scaleData['font-size']?.modes) {
      const modes = scaleData['font-size'].modes
      const minValue = resolveTokenReference(modes['mobile (min)'], tokens.tokens, 'mobile (min)')
      css += `  --typography-${scale}-font-size: calc(${minValue} * var(--typography-scale, 1));\n`
    }

    // Line height
    if (scaleData['line-height']?.modes) {
      const modes = scaleData['line-height'].modes
      const minValue = resolveTokenReference(modes['mobile (min)'], tokens.tokens, 'mobile (min)')
      css += `  --typography-${scale}-line-height: calc(${minValue} * var(--typography-scale, 1));\n`
    }
  }

  css += '}\n\n'

  // Generate window-responsive: xs (explicitly for clarity)
  css += `/* Window-responsive: Extra small (< 640px / mobile) */\n[data-window-size="xs"] {\n`

  for (const scale of scales) {
    const scaleData = typography[scale]
    if (!scaleData) continue

    if (scaleData['font-size']?.modes?.['mobile (min)']) {
      const value = resolveTokenReference(
        scaleData['font-size'].modes['mobile (min)'],
        tokens.tokens,
        'mobile (min)'
      )
      css += `  --typography-${scale}-font-size: calc(${value} * var(--typography-scale, 1));\n`
    }

    if (scaleData['line-height']?.modes?.['mobile (min)']) {
      const value = resolveTokenReference(
        scaleData['line-height'].modes['mobile (min)'],
        tokens.tokens,
        'mobile (min)'
      )
      css += `  --typography-${scale}-line-height: calc(${value} * var(--typography-scale, 1));\n`
    }
  }

  css += '}\n\n'

  // Generate remaining breakpoints (sm, md, lg, xl)
  for (const breakpoint of breakpoints.slice(1)) {
    // Viewport-based media query
    if (breakpoint.minWidth) {
      const bpName = breakpoint.description.split('(')[0].trim()
      const bpSize = breakpoint.minWidth.replace('rem', '') * 16
      css += `/* ${bpName} (${breakpoint.name}: ${bpSize}px+) */\n`
      css += `@media (min-width: ${breakpoint.minWidth}) {\n  :root {\n`

      for (const scale of scales) {
        const scaleData = typography[scale]
        if (!scaleData) continue

        if (scaleData['font-size']?.modes?.[breakpoint.mode]) {
          const value = resolveTokenReference(
            scaleData['font-size'].modes[breakpoint.mode],
            tokens.tokens,
            breakpoint.mode
          )
          css += `    --typography-${scale}-font-size: calc(${value} * var(--typography-scale, 1));\n`
        }

        if (scaleData['line-height']?.modes?.[breakpoint.mode]) {
          const value = resolveTokenReference(
            scaleData['line-height'].modes[breakpoint.mode],
            tokens.tokens,
            breakpoint.mode
          )
          css += `    --typography-${scale}-line-height: calc(${value} * var(--typography-scale, 1));\n`
        }
      }

      css += '  }\n}\n\n'
    }

    // Window-responsive data attribute
    css += `/* Window-responsive: ${breakpoint.description} */\n`
    css += `[data-window-size="${breakpoint.name}"] {\n`

    for (const scale of scales) {
      const scaleData = typography[scale]
      if (!scaleData) continue

      if (scaleData['font-size']?.modes?.[breakpoint.mode]) {
        const value = resolveTokenReference(
          scaleData['font-size'].modes[breakpoint.mode],
          tokens.tokens,
          breakpoint.mode
        )
        css += `  --typography-${scale}-font-size: calc(${value} * var(--typography-scale, 1));\n`
      }

      if (scaleData['line-height']?.modes?.[breakpoint.mode]) {
        const value = resolveTokenReference(
          scaleData['line-height'].modes[breakpoint.mode],
          tokens.tokens,
          breakpoint.mode
        )
        css += `  --typography-${scale}-line-height: calc(${value} * var(--typography-scale, 1));\n`
      }
    }

    css += '}\n\n'
  }

  // Generate utility classes for Tailwind
  css += '/* Utility classes for typography */\n@layer utilities {\n'

  // Font size utilities (use 'size-' prefix for custom scale)
  css += '  /* Font Size Utilities (Custom Scale) */\n'
  for (const scale of scales) {
    css += `  .size-${scale} { font-size: var(--typography-${scale}-font-size); }\n`
  }

  css += '\n  /* Line Height Utilities (Custom Scale) */\n'
  for (const scale of scales) {
    css += `  .leading-${scale} { line-height: var(--typography-${scale}-line-height); }\n`
  }

  css += '\n  /* Combined Typography Utilities (size + leading, Custom Scale) */\n'
  for (const scale of scales) {
    css += `  .type-${scale} {\n`
    css += `    font-size: var(--typography-${scale}-font-size);\n`
    css += `    line-height: var(--typography-${scale}-line-height);\n`
    css += '  }\n'
  }

  // Map Tailwind standard text utilities to custom scale
  // This provides familiar Tailwind utilities while using your custom responsive scale
  // Mapping:
  // - text-xs (12px) → caption-1 (12px mobile, 12px desktop)
  // - text-sm (14px) → callout (14px mobile, 15px desktop)
  // - text-base (16px) → body (16px all sizes)
  // - text-lg (18px) → headline (17px mobile, 18-20px desktop)
  // - text-xl (20px) → title-3 (20px mobile, 22-24px desktop)
  // - text-2xl (24px) → title-3 (20px mobile, 22-24px desktop)
  // - text-3xl (30px) → title-2 (22px mobile, 30-36px desktop)
  // - text-4xl (36px) → title-1 (28px mobile, 36-48px desktop)
  // - text-5xl+ (48px+) → large-title (34px mobile, 48-60px desktop)
  css += '\n  /* Tailwind Standard Text Utilities (mapped to custom scale) */\n'
  css +=
    '  .text-xs { font-size: var(--typography-caption-1-font-size); line-height: var(--typography-caption-1-line-height); }\n'
  css +=
    '  .text-sm { font-size: var(--typography-callout-font-size); line-height: var(--typography-callout-line-height); }\n'
  css +=
    '  .text-base { font-size: var(--typography-body-font-size); line-height: var(--typography-body-line-height); }\n'
  css +=
    '  .text-lg { font-size: var(--typography-headline-font-size); line-height: var(--typography-headline-line-height); }\n'
  css +=
    '  .text-xl { font-size: var(--typography-title-3-font-size); line-height: var(--typography-title-3-line-height); }\n'
  css +=
    '  .text-2xl { font-size: var(--typography-title-3-font-size); line-height: var(--typography-title-3-line-height); }\n'
  css +=
    '  .text-3xl { font-size: var(--typography-title-2-font-size); line-height: var(--typography-title-2-line-height); }\n'
  css +=
    '  .text-4xl { font-size: var(--typography-title-1-font-size); line-height: var(--typography-title-1-line-height); }\n'
  css +=
    '  .text-5xl { font-size: var(--typography-large-title-font-size); line-height: var(--typography-large-title-line-height); }\n'
  css +=
    '  .text-6xl { font-size: var(--typography-large-title-font-size); line-height: var(--typography-large-title-line-height); }\n'
  css +=
    '  .text-7xl { font-size: var(--typography-large-title-font-size); line-height: var(--typography-large-title-line-height); }\n'
  css +=
    '  .text-8xl { font-size: var(--typography-large-title-font-size); line-height: var(--typography-large-title-line-height); }\n'
  css +=
    '  .text-9xl { font-size: var(--typography-large-title-font-size); line-height: var(--typography-large-title-line-height); }\n'

  css += '}\n'

  return css
}

/**
 * Generate shadow CSS with utility classes
 * Extracts shadow tokens from the styles collection and generates
 * CSS custom properties and Tailwind utility classes
 */
function generateShadowCSS() {
  const shadowStyles = styles?.styles?.effect?.shadow
  if (!shadowStyles) {
    console.warn('⚠️  No shadow tokens found in styles.json')
    return ''
  }

  let css = `/* =====================================================
   Shadow - Design System Shadow Tokens
   DO NOT EDIT THIS FILE DIRECTLY
   Edit styles.json and regenerate using npm run tokens
   ===================================================== */

/* Shadow System
   Shadow tokens for consistent elevation and depth
   Each shadow level includes drop-shadow effects */

/* Define custom properties for shadow tokens */
:root {
`

  // Generate CSS variables for each shadow level
  const shadowLevels = Object.keys(shadowStyles).sort(
    (a, b) => Number.parseInt(a) - Number.parseInt(b)
  )

  for (const level of shadowLevels) {
    const shadowData = shadowStyles[level]
    if (!shadowData?.effects) continue

    // Extract drop-shadow effects (ignore background-blur)
    const dropShadows = shadowData.effects
      .filter(effect => effect.type === 'drop-shadow')
      .map(effect => {
        const { offsetX, offsetY, radius, spread, color } = effect
        // Convert to CSS box-shadow format: offsetX offsetY blur spread color
        return `${offsetX} ${offsetY} ${radius} ${spread} ${color}`
      })
      .join(', ')

    if (dropShadows) {
      const description = shadowData.description ? ` /* ${shadowData.description} */` : ''
      css += `  --shadow-${level}: ${dropShadows};${description}\n`
    }
  }

  css += '}\n\n'

  // Generate utility classes for Tailwind
  css += '/* Utility classes for shadows */\n@layer utilities {\n'

  for (const level of shadowLevels) {
    const shadowData = shadowStyles[level]
    if (!shadowData?.effects?.some(e => e.type === 'drop-shadow')) continue

    css += `  .shadow-${level} { box-shadow: var(--shadow-${level}); }\n`
  }

  css += '}\n'

  return css
}

/**
 * Generate CSS file for a collection
 */
function generateCollectionCSS(collectionName) {
  const collectionMeta = collections[collectionName]
  if (!collectionMeta) {
    console.warn(`⚠️  Collection not found in metadata: ${collectionName}`)
    return ''
  }

  const { name, description, modes = [] } = collectionMeta
  const hasModes = modes.length > 1 // More than just "Default"

  let css = `/* =====================================================
   ${name} - Auto-generated from tokens.json
   DO NOT EDIT THIS FILE DIRECTLY
   Edit tokens.json and regenerate using npm run tokens
   ===================================================== */

/* ${description} */

`

  // Add Tailwind theme inline block for semantics (with modes), abstractions, and primitives
  if (hasModes || collectionName === 'abstractions' || collectionName === 'primitives') {
    const themeInline = generateTailwindThemeInline(collectionName)
    if (themeInline) {
      css += themeInline
    }
  }

  // Generate CSS for each mode
  if (hasModes) {
    // Multiple modes (like Light/Dark)
    for (const mode of modes) {
      const selector = mode === 'Light' ? ':root' : `.${mode.toLowerCase()}`
      const modeLabel = mode === 'Light' ? 'Light Theme' : `${mode} Theme`

      css += `/* ${modeLabel} */\n${selector} {\n${generateCSSVariables(collectionName, mode)}\n}\n\n`
    }
  } else {
    // Single mode (like Default for primitives/abstractions)
    css += `:root {\n${generateCSSVariables(collectionName, modes[0] || undefined)}\n}\n`
  }

  return css
}

// Generate and write CSS files for each collection
const themePath = join(rootDir, 'src/')
const generatedFiles = []

for (const collectionName of collectionNames) {
  // Handle responsive collection separately - typography tokens
  if (collectionName === 'responsive') {
    const typographyCSS = generateResponsiveTypographyCSS()
    if (typographyCSS) {
      const filename = 'typography-tokens.css'
      const filepath = join(themePath, filename)
      writeFileSync(filepath, typographyCSS, 'utf-8')

      // Count typography tokens
      const scales = Object.keys(tokens.tokens?.responsive?.typography || {})
      const tokenCount = scales.length * 2 // font-size + line-height per scale

      generatedFiles.push({
        filename,
        tokenCount,
        modeInfo: ' (3 breakpoints)',
      })
    }
    continue
  }

  // Handle shadows separately - extract from styles.json
  if (collectionName === 'primitives') {
    const shadowCSS = generateShadowCSS()
    if (shadowCSS) {
      const filename = 'shadow-tokens.css'
      const filepath = join(themePath, filename)
      writeFileSync(filepath, shadowCSS, 'utf-8')

      // Count shadow tokens
      const shadowCount = Object.keys(styles?.styles?.effect?.shadow || {}).length

      generatedFiles.push({
        filename,
        tokenCount: shadowCount,
        modeInfo: '',
      })
    }
  }

  const collectionMeta = collections[collectionName]
  const css = generateCollectionCSS(collectionName)

  if (!css) {
    continue
  }

  // Generate filename: primitives.css, abstractions.css, semantics.css
  const filename = `${collectionName}.css`
  const filepath = join(themePath, filename)

  writeFileSync(filepath, css, 'utf-8')

  // Count tokens
  const modes = collectionMeta.modes || []
  const firstMode = modes[0]
  const { resolved } = getResolvedTokens(collectionName, firstMode)
  const tokenCount = Object.keys(resolved).length
  const modeInfo = modes.length > 1 ? ` (${modes.length} modes)` : ''

  generatedFiles.push({
    filename,
    tokenCount,
    modeInfo,
  })
}

// Log results
console.log('✅ Generated token files:')
for (const { filename, tokenCount, modeInfo } of generatedFiles) {
  console.log(`   - ${filename} (${tokenCount} tokens${modeInfo})`)
}
console.log(`   📁 ${themePath}`)
