# Little days application entry

The September 19, 2026 request to refactor the project and remove examples promotes Little days into the single production entry. Focus is the initial interface: a reachable recorder beside recent history on desktop, stacked vertically on phones. Daybook and Careboard were alternative prototypes and are no longer runtime routes. Platform preview controls and the direction picker are removed.

Children, records, stock, custom types, and active timers share a typed, versioned workspace. New installations start empty. Local writes validate data and report errors before changing application state. Browser origins and native installs have independent data stores. Timers store timestamps so their duration can be recovered without continuous background execution.

Existing Journal and Collage source and unrelated prototypes contain previous uncommitted work and remain preserved, disconnected from the main entry. Their storage is untouched. All examples are removed; native hosts and Vite use the root entry. Bundle identifier `com.dds.app` is kept to avoid treating this refactor as a separate installed app.

Widgets, OS notifications, cloud synchronization, encrypted storage, backup and distribution remain separate work. This refactor establishes the application foundation rather than claiming those integrations are present.

## Local verification

- `pnpm test`: 30 files, 157 tests passed, including persistence, storage errors, custom fields, stock use, timer restoration and original-child ownership, delete/Undo, and legacy module regression tests.
- `pnpm build`: TypeScript and single-entry production build passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 2 tests passed.
- `pnpm exec tauri build --debug --no-bundle`: macOS application built.
- iPhone 17 Pro / iOS 26.2 Simulator: application built, installed, and root onboarding verified. Native date-field overflow was corrected.
- Production web build: desktop and 390px layouts inspected; new profile and feeding record survived reload.
- vivo Y78t / Android 13: standalone ARM64 debug APK built, installed via USB, and launched as the foreground activity. Startup logs showed no application crash; full Android interaction testing remains separate. Existing Rust naming/dead-code warnings remain.

Review was performed sequentially in the main task, following the repository tool mapping; it was not an independent cross-model review. Changes are left uncommitted with pre-existing work preserved.
