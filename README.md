# DDS (Daily Duty Schedule)

A Tauri 2 task app built with React 19, TypeScript, Vite and the locally imported Streamify/Ancher design system.

## Development

```sh
pnpm install
pnpm tauri dev
```

`pnpm dev` starts the browser frontend; task commands require the Tauri desktop host.

```sh
pnpm typecheck
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

## Design system

Shared React UI, CSS tokens and styles live in `packages/`, linked through pnpm workspaces. Import components by subpath (for example, `@vita/ui/button`). [Migration notes](docs/design-system-migration.md) record the upstream revision, local adaptations and verification scope.

The main app supports adding, listing and completing tasks. Task storage remains in-memory, as in the original application.
