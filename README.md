# Little days

A local-first care journal for children aged 0–6, built with React, TypeScript, Tauri 2, and the shared Vita design system. Desktop, iOS, and Android use the same application entry at `/`.

Create a child profile, record feeding, diaper changes, sleep, bathing, vaccinations, growth, and vitamins. Build custom record types from timers, counters, measurements, choices, notes, and dates. Track family supplies with refill thresholds. Search history, edit records, delete with Undo, and resume active timers after reopening the app.

Settings offers System, Light, and Dark appearances, remembered on each device. Appearance settings are also available before creating a child profile.

## Development

```sh
pnpm install
pnpm dev                 # Browser: http://localhost:1420
pnpm dev:desktop         # Tauri desktop
pnpm init:ios            # Once, with Xcode installed
pnpm dev:ios             # Select a simulator/device
pnpm init:android        # Once, with Android SDK/NDK installed
pnpm dev:android
```

To select the simulator directly: `pnpm dev:ios 'iPhone 17 Pro'`. Close another development process using port 1420 before launching. No example URL or configuration override is required.

## Verification and builds

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm build:desktop
pnpm build:ios:sim
pnpm build:android
```

Native builds require the corresponding SDK. Device signing and store distribution require platform-specific setup.

For SDK paths, standalone APK builds, and USB installation, see [Android physical-device development](docs/android-device.md).

## Structure

- `src/main.tsx`, `src/App.tsx`: single application entry.
- `src/features/little-days/domain/`: validated domain schemas and date/timer calculations.
- `src/features/little-days/storage/`: local persistence boundary.
- `src/features/little-days/hooks/`: workspace actions, context consumption, and nursing clock lifecycle.
- `src/features/little-days/state/`: workspace context, provider, and navigation/dialog types.
- `src/features/little-days/components/`: components grouped by responsibility; forms live with their feature.
- `src/features/little-days/pages/`: page composition. See the [feature structure](src/features/little-days/README.md).
- `packages/`: shared UI, typography, tokens, and styles.
- `src-tauri/`: desktop, iOS, and Android hosts.

`examples/` has been removed. Earlier Journal and Collage modules and unrelated prototypes remain as historical work, disconnected from the shipped entry. Their tests remain intact. The Little days prototype has been promoted and removed.

## Data and current boundaries

New installations start empty; no fictional children or medical records are inserted. Data uses the versioned `little-days.workspace.v1` local-storage key. Writes validate the full workspace; failed saves preserve the form, and unreadable data is never silently reset. Timers persist their start timestamps and paused duration; elapsed time is recalculated after reopening. Each browser origin and each native installation has its own storage. This is not encrypted storage or a backup service; uninstalling or clearing app data removes records. Old Journal/Collage storage is not imported or deleted.

LocalStorage is the first persistence adapter. Cloud sync, backup/export/import, profile editing, notifications, widgets, Live Activities, and store release setup are not implemented. Timers do not require a continuously running WebView, but there are no background notifications. Vaccination and vitamin entries record caregiver input; the app does not prescribe schedules or dosage.
