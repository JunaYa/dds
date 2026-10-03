# Shared UI components

- Before adding or changing UI, check `packages/ui` and `packages/iconography` for an existing component. Import through the package's public exports (`@vita/ui/...`); do not import package source paths.
- Application code under `src/` composes shared controls. Use the shared Button, Input, Textarea, Select/NativeSelect, DateTimePicker, dialogs, and other available primitives instead of raw interactive elements or direct third-party primitive imports.
- Use `NativeInput` from `@vita/ui/input` for native radio, range, and file controls that need caller-owned geometry. Use `NativeSelect` when native option children and platform selection behavior are needed; use the compound Select for custom menus.
- Reusable, domain-independent UI belongs in `packages/ui`, including its styles and behavior tests. Add a public package export. Keep labels, locale, data, and callbacks configurable; do not import application state or feature modules from packages.
- Business forms, record logic, profile data, and domain-specific compositions remain in their feature directories. Semantic HTML layout (`form`, `label`, `section`, etc.) does not need a wrapper component.
- Preserve form submission, validation, focus, refs, keyboard/touch interaction, language switching, and local date/time values when migrating components. Prefer existing variants; use `Button unstyled` only for surfaces with existing custom layout styles.
- Run `pnpm check:ui`, type checking, and tests relevant to changed components. The UI boundary check also runs as part of type checking.
