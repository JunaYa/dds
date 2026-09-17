# DDS · 日日记

A local journal for desktop, iOS and Android, built with Tauri 2, React 19 and the project's shared `@vita/ui` components and styles.

The main application supports configurable record types, recurring tasks, dashboard counters, media attachments and on-device image recognition for creating events. Records and attachments persist locally. The example at `/examples/journal/` shares the implementation and uses a separate database with demonstration data.

## Run

```sh
pnpm install
pnpm dev                 # Main application in a browser
pnpm dev:journal         # Example with demonstration data
pnpm dev:desktop         # Native desktop app
pnpm init:ios
pnpm dev:ios
pnpm init:android
pnpm dev:android
```

Native mobile development requires the platform SDKs. See [platform setup, build commands and limitations](docs/journal-platforms.md) and [the journal workflows](examples/journal/README.md).

## Verify

```sh
pnpm typecheck
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

## Structure

- `src/features/journal/`: shared domain model, persistence, OCR and application UI.
- `src/App.tsx`: production entry; starts with an empty journal.
- `examples/journal/`: thin demo entry; preserves the existing example database.
- `packages/`: local UI components, tokens and styles. [Design system notes](docs/design-system-migration.md).
- `src-tauri/`: native host and mobile platform configuration.

Data stays on each device; there is no cloud sync. Reminders currently appear inside the app and do not run as background system notifications. OCR downloads its engine and language packs on first use; images are processed locally. Store signing, real-device camera validation and distribution are separate from local builds.
