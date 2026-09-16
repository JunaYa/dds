# @vita/tokens

Design-token CSS for the Vita platform. Apps consume the tokens with:

```css
@import "@vita/tokens/css";
```

## Layout

- `src/*.css` — the token layers (`primitives`, `aliases`, `semantics`, `effects`,
  `typography-fluid`, `radius`) plus the non-default `typography.css` alternative.
- `src/index.css` — the import chain that web, extension, and desktop pull in.
- `reference/` — the **archived** Figma → CSS generator and its token exports,
  kept for provenance only (see [`reference/README.md`](reference/README.md)).

## Source of truth

The CSS layers in `src/` are the **hand-maintained source of truth** — edit them
directly. There is no token-generation step: the original Figma → CSS generator
drifted from the committed CSS (it would emit differently named layers and change
primitive/semantic values), so it was archived under `reference/` rather than
left wired up as a misleading `pnpm tokens` command. If a Figma-driven pipeline is
wanted again, `reference/README.md` explains what reconciliation it would need.
