# Little days app icon

A green embrace holds an apricot baby face, with a leaf suggesting healthy growth.
A curl and smile identify the baby; open journal pages in the lower cradle
represent recording daily care and milestones.
The symbol reflects the family journal described in the application README:
care through pregnancy, birth, postpartum recovery, and childhood.

The palette uses warm cream, leaf green, and apricot. Flat silhouettes and gentle
tonal gradients give a little depth without glossy highlights, bevels, or shadows.
`app-icon.png` is the
1254 × 1254 opaque master created with the built-in image generation tool.
The exact generation prompt is saved in `prompt.txt`.
The earlier flat artwork and its prompt are preserved in `app-icon-flat.png`
and `prompt-flat.txt`.
The glass exploration is preserved in `app-icon-glass.png` and `prompt-glass.txt`.
The earlier soft-gradient mark is preserved in `app-icon-soft.png` and
`prompt-soft.txt`, with its tray silhouette in `tray-white-original.png`.

`tray-white.png` is a separate white silhouette with an alpha-transparent
background, extracted from the colored master. Imagegen transparency attempts
were discarded because of edge artifacts. `pnpm brand:generate` resizes the
clean source to `src-tauri/icons/tray-white.png` (32 × 32), embedded by the tray.
The tray retains white pixels rather than using macOS template recoloring.

Run `pnpm brand:generate` from the repository root to export desktop PNG, ICO,
and ICNS files into `src-tauri/icons`, update the initialized iOS asset catalog
and Android launcher resources under `src-tauri/gen`, and copy the browser icon
to `src/assets/icon.png`. Initialize mobile projects before regenerating their
icons. Tauri applies the platform sizes and Android adaptive launcher structure.

These assets are the Little days application identity. Older Ancher materials
elsewhere in this package belong to the inherited design system.
