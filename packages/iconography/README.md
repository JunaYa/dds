# @vita/iconography

Shared iconography for Ancher brand marks, marketing line art, social/tool marks, and the product icon alias layer.

## Submodules

- `@vita/iconography/ancher` - Ancher app icon, brand glyph, and brand-only icon components.
- `@vita/iconography/line-art` - Small monochrome marketing line-art SVGs.
- `@vita/iconography/line-graphics` - Larger monochrome marketing line-graphic SVGs.
- `@vita/iconography/social` - Social brand icons with their original colors preserved.
- `@vita/iconography/tools` - Tool/provider icons.
- `@vita/iconography/icons` - Product icon abstraction layer (`IconRenderer`, `IconBadge`, `IconName`).

## Adding Or Updating SVGs

For line-art and line-graphic assets, drop or replace the SVG in the matching assets folder:

```text
packages/iconography/src/line-art/assets/
packages/iconography/src/line-graphics/assets/
```

The catalog is generated from filename stems. For example, `line-art-10.svg` becomes:

```tsx
<LineArtIcon name="line-art-10" />
```

No registry edit is needed for these two catalogs.

Social icons use an intent-to-asset registry in `src/social/catalog.ts`; add the SVG asset first, then map the public icon name to the asset filename stem.

Product icons live in `src/icons/icons.tsx`; update the `Icons` registry there when adding or changing an app/product icon alias.

## SVG Color Rules

Line-art and line-graphic SVGs are normalized at runtime so visible black or white fills/strokes become `currentColor`. This lets consumers style icons with text color utilities like `text-foreground`.

Mask contents are intentionally left alone. If an SVG uses `<mask>`, keep the exported mask colors as-is because white/black inside masks controls luminance, not the visible icon color.

Social icons preserve original brand colors and are not run through the monochrome color rewrite.

## Validate Changes

After adding or updating SVGs, run:

```bash
pnpm --filter @vita/iconography test
pnpm --filter @vita/iconography typecheck
pnpm storybook
```

Then validate the icon visually in the canonical Storybook at:

```text
http://localhost:6007/
```

Use the `Iconography/Catalog` stories to confirm sizing, color inheritance, and mask/gradient behavior.
