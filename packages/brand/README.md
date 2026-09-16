# @vita/brand

Single source of truth for the Ancher brand: logo geometry, React lockups, and the generator that renders every platform icon artifact. Apps never keep their own copy of the mark — they import the React components or reference the generated files this package owns. Root scripts: `pnpm brand:generate` / `pnpm brand:check`.

## Layout

```
brand.config.mjs  declarative matrix: sources × platforms × variants — edit THIS to
                  change which colorway a platform uses (pure data, no logic)
src/
  logo-data.ts    symbol/wordmark path data, viewBoxes, lockup ratios (vector source of truth)
  react.tsx       AppLogo / AnimatedLogo / AnimatedSymbol (all in-app renders)
  constants.ts    brand name + colors (theme-color meta, manifest theme_color)
assets/
  source/         designed app-icon renders — generator inputs (light / dark / blue)
  design/         original design material (Apple .icon bundle, iOS export variants)
scripts/
  generate-assets.mjs   renders the 43 committed artifacts declared by brand.config.mjs
  check-assets.mjs      CI drift gate: re-renders and fails on any diff
```

## Consuming the logo

- **React surfaces (web, extension):** `import { AppLogo } from '@vita/brand/react'`. Marks render with `currentColor` and follow the surrounding foreground; pass `colored` to use the `--primary` token.
- **Static files** (web `public/favicons/*`, extension `public/icons/*`, desktop `src-tauri/icons/*` including the macOS dock light/dark pair): these are **generated artifacts** committed into each app's required directory. Never edit them by hand.

## Changing the logo or icons

1. Update the vector data in `src/logo-data.ts` and/or the designed renders in `assets/source/`.
2. Run `pnpm brand:generate` (root script; equivalent to `pnpm --filter @vita/brand generate`).
3. Commit the regenerated artifacts together with the source change.

CI runs `pnpm brand:check`, which re-renders everything and fails when a committed artifact drifts from the sources. Renderer versions (`sharp`, `png2icons`) are pinned exactly to keep output byte-stable; if `check` fails without a brand change, regenerate on the CI platform rather than loosening the gate.

## Configuration matrix (`brand.config.mjs`)

The generator is driven entirely by three data layers — no per-platform logic lives in the scripts:

| Layer | What it declares |
|---|---|
| `SOURCES` | Design renders in `assets/source/`: `favicon` (web + extension light icons), `light` (1024 light app icon for desktop), `dark` (black plate + white symbol), `blue` (legacy blue plate) |
| `SETS` | The file shapes each platform needs (`favicons`, `extensionIcons`, `tauriBundle`), independent of colorway |
| `TARGETS` | The matrix rows: platform × variant × `source` × output dir, plus optional `transform` (e.g. `macPad`) |

Current matrix:

| Platform | Output | Source | Notes |
|---|---|---|---|
| web | `apps/web/public/favicons/*` | `favicon` | consumed by `index.html` / `pwa.ts` / `metadata.ts` |
| web | `apps/web/public/favicons/dark/*` | `dark` | reserved for a `prefers-color-scheme` favicon swap |
| extension | `apps/extension/public/icons/icon-*.png` | `favicon` | the manifest set — Chrome toolbar, Extensions menu, notifications |
| extension | `apps/extension/public/icons/light/*`, `dark/*` | `favicon` / `dark` | page favicons (welcome/options) use `light/`; `dark/` reserved for theme-aware toolbar icons |
| desktop | `apps/desktop/src-tauri/icons/*` (bundle + dock pair) | `blue` | `app-icon-default-1024.png` with `macPad` transform: 824px plate on a 1024 canvas (macOS HIG grid) |

**To change a platform's colorway** edit that target's `source:` (one word, e.g. back to `blue` for the extension manifest), run `pnpm brand:generate`, and commit. Browsers cache extension icons — reload the extension in `chrome://extensions` to see the change.

**Known trade-off:** the light plate sits low-contrast on Chrome's light toolbar/menu rows. If that bothers users, either point the extension manifest back at `blue`, or wire the reserved `icons/dark|light` sets into a theme-aware `action.setIcon` swap.

## Design recipe

One symbol, colorway sources × platform targets, all declared in `brand.config.mjs`:

- **Favicon colorway** (light plate + black symbol) — the default for web favicons/PWA icons plus extension manifest/toolbar icons and page favicons.
- Web `favicon.ico` embeds the same `sharp`-resized small PNG renders as `favicon-16x16.png` / `favicon-32x32.png`, so Chrome tab favicons match the extension icon treatment instead of using a separate ICO resampling path.
- **Blue plate** (`blue` source, `app-icon-default-1024.png`) — desktop bundle icons plus both runtime dock images.
- **Light app-icon colorway** (1024 light plate + black symbol) — kept configurable for platforms that need a light app icon.
- **Dark colorway** (black plate + white symbol) — generated for web `favicons/dark/*` and extension `icons/dark/*`, reserved for theme-aware swaps.
- Desktop targets use the `macPad` transform (824px plate centered on a 1024 canvas per the macOS HIG grid) before per-size rendering.
- **In-app marks** — monochrome `currentColor` via the React lockups; brand blue (`BRAND_COLORS.primary`, `#366fb6`) matches `--color-b1-500` in `@vita/tokens`.

This package is a dependency-cruiser–enforced leaf: it must not import app source or other workspace packages.
