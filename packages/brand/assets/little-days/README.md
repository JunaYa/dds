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

## macOS Dock icon

`app-icon-macos.png` is the separate alpha-transparent macOS master, adapted
from the original artwork with a cream rounded-square tile and outer padding.
The apricot baby sits inside a green protective embrace. A smaller leaf conveys
healthy growth, while an open journal with three connected milestone dots makes
growth data recording explicit. At small Dock sizes the baby and embrace carry
recognition; the journal details become legible as the icon grows. The design
prompt is retained in `prompt-macos.txt`.
It follows the rounded-rectangle direction in the
[Apple app icon guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons/).
This is a raster adaptation for the existing Tauri ICNS pipeline, not an Icon
Composer layered asset or an exact Apple system mask.

Run `pnpm brand:generate:macos` to regenerate only `src-tauri/icons/icon.icns`.
The full `pnpm brand:generate` command also runs this step last, preserving the
macOS-specific contour while leaving the opaque master for other platforms.
