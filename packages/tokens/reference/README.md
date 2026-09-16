# `@vita/tokens` reference (archived — not authoritative)

This directory preserves the original Figma → CSS token pipeline for provenance.
**It is not wired into any build and is not the source of truth.**

- `tokens.json`, `styles.json` — the Figma token/style exports (retrieved from git
  history at the last commit that contained them, `96015b2ab^`).
- `generate-tokens.js` — the generator that originally turned those exports into
  the CSS layers in `../src/`.

## Why it's archived

The committed CSS layers in [`../src`](../src) have been **hand-curated since the
last generation** — layers were renamed and reorganized, and primitive/semantic
values were edited directly. Running `generate-tokens.js` against `tokens.json` /
`styles.json` today does **not** reproduce `../src/*.css`: it emits differently
named layers (`shadow-tokens.css`, `abstractions.css`, `Tailwind Colors.css`,
`typography-tokens.css`) and large diffs in `primitives.css` / `semantics.css`.

So the generator has drifted from the CSS, and re-running it would silently change
the design. The **CSS in `../src` is the source of truth** — edit it directly.

If a true Figma-driven pipeline is wanted again, treat this as a starting point:
the generator's output naming/structure would need to be reconciled with the
current layers, and the regenerated tokens audited as a new baseline.
