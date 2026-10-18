# Little days structure

`App.tsx` is the feature entry. It mounts the workspace provider and chooses between recovery, onboarding, and the application pages.

```text
little-days/
├── App.tsx / App.test.tsx
├── pages/                  # Focus composition, supplies, record types
├── components/
│   ├── children/           # Profile picker and child form
│   ├── common/             # Icon and save-error feedback
│   ├── dialogs/            # Workspace dialog and form composition
│   ├── layout/             # Shell, navigation, header and overlays
│   ├── nursing/            # Timer, start-time editor, mini bar and motion CSS
│   ├── record-types/       # Custom record type builder
│   ├── records/            # Record form, field inputs, history and filters
│   ├── supplies/           # Supply and restock form
│   └── timers/             # General session banner
├── i18n/                   # English/Chinese messages, locale provider and built-in record labels
├── hooks/                  # useApp, useWorkspaceState, useNursingClock
├── state/                  # Context, provider and UI state types
├── domain/                 # Zod schemas, defaults and pure calculations
├── storage/                # Versioned localStorage reads and writes
└── styles/                 # Shared application CSS
```

Appearance settings use `components/settings/ThemePicker.tsx`, `pages/Settings.tsx`, and `state/ThemeProvider.tsx`. `storage/preferences.ts` stores the light/dark/system preference separately from care records. The small `index.html` bootstrap applies that preference before React loads; keep its storage key and fallback in sync with the preference adapter. The bootstrap is covered by the settings tests.

Use direct imports from the owning module. Do not re-export unrelated hooks or components from a shared UI file. Forms and tests belong beside the feature they exercise; application-level tests remain beside `App.tsx`.

Pages compose components. `Shell` accepts page content through `children` and does not import pages. `Focus` owns record-type selection across navigation, so moving between supplies and today's records preserves the selected type.

Components access workspace actions through `useApp`. `WorkspaceProvider` owns a single `useWorkspaceState` instance; only that hook coordinates persistent mutations. The context references its return type through a type-only import, avoiding a runtime dependency cycle. `storage/` depends on `domain/`, and neither layer imports React or UI components.

Keep persistence validation, the storage key, and timer timestamp calculations unchanged during structural refactors. Global styles are loaded from `src/styles.css` in their existing order; nursing-specific styles stay with the nursing components.

Language settings live in `components/settings/LanguagePicker.tsx`. `storage/locale.ts` reads the preference. `i18n/LocaleProvider.tsx` defaults to the device language (Chinese for `zh-*`, English otherwise), stores explicit choices under `little-days.locale`, and synchronizes windows. Keep interface phrases in `i18n/messages.ts`; use `tr(key, params)` for sentences with variables. Dates use the selected locale. Translate built-in record labels only at render time with `i18n/record-labels.ts`; never translate persisted IDs, choice values, names, or user-entered notes.

Keep the locale Context, provider component, and `useI18n` hook in separate modules, as with theme state. This keeps the Context identity stable when React Fast Refresh replaces the provider. Missing providers must fail explicitly rather than returning an English default with a no-op language switch.

Shared controls are imported through `@vita/ui`. Record time, birthday, and date fields use `DateTimePicker`; nursing's time columns use `WheelPicker`. Their implementation and tests live in `packages/ui`, while record values and translations remain here. See the root `AGENTS.md` and `packages/ui/README.md` for component ownership and the `pnpm check:ui` boundary check.

## Backups

Profile → Import and export (also available in Settings before adding a child) exports a versioned `little-days-backup` JSON document. It contains all child profiles, types, records, imported photos/source metadata, supplies, and the timer snapshot. Language and appearance remain device preferences. iOS exports through the system share sheet (Save to Files); desktop/Android use the native save dialog; browsers download JSON.

Import previews additions before saving through the workspace's existing atomic storage commit. Merge mode keeps local versions of duplicate identifiers and remaps conflicting record types. Users can map incoming children to existing profiles, replace all records for selected children, or create separate new profiles. Replacement requires explicit confirmation and never affects other children. Imports do not resume timers; an active local timer must be finished before importing. Files are limited to 20 MB; storage quota and concurrent-window errors leave existing data unchanged.

`backup/cali.ts` supports Cali Baby portable backup version 1. It maps feeding, pumping, diapers, growth, sleep, vaccinations, temperature, sun exposure and bath records; nonempty unsupported collections reject the entire import. Event milliseconds are converted using the source timezone, with nursing sides converted to seconds and durations to minutes. Raw source fields and JPEG/PNG note photos survive export and record edits. Imported IDs are namespaced so repeated imports are idempotent. This is a one-way adapter: exported files use Little days format, not Cali format.

Run `pnpm exec vitest run src/features/little-days/backup`. Set `CALI_BACKUP_PATH` to a local `.calibabybackup` path to run the optional 44-record compatibility check; personal backup files must not be committed as fixtures.


### Receiving iOS shares

`Info.ios.plist` registers document handling for Cali and Little days backups. The `public.data` fallback allows files from third-party apps with different UTIs; actual import is restricted to backup extensions, format, version, size and schema. The system's Open in / Copy to Little days action launches the app directly, without a share extension or App Group.

`RunEvent::Opened` forwards file URLs to the native inbox, which acquires security-scoped access, copies at most 20 MB per file into app-private storage, and releases access. The inbox retains up to five pending files plus a queue-full notice. Cold and warm starts read the same inbox. Files are removed only after explicit cancellation or successful import, not when a preview is shown. Dialogs and the nursing timer defer automatic navigation until closed.

Before an import, `saveImportWorkspace` validates the change and saves the previous workspace under `little-days.before-import.v1`. If snapshot creation or the workspace write fails, existing workspace data stays intact. The latest snapshot can be exported or restored; restoration saves the current data as the new recovery snapshot. Device storage clearing/uninstall removes both workspace and recovery data, so exported copies remain useful.

The synthetic cross-app iOS test is in `src-tauri/plugins/native-navigation/ios/ShareUITests`. It checks the share destination, cold-start preview and persistence across relaunch without importing fixture records into the workspace.

### Haptic feedback

Profile settings offer a device-local haptic preference, enabled by default (`little-days.haptics`). Supported mobile environments use lightweight feedback on trusted control clicks and native tab/add actions. iOS uses UIImpactFeedbackGenerator; Android uses the WebView Vibration API with VIBRATE permission. Unsupported environments are silent and hide the setting. The toggle takes effect immediately even if preference storage fails, with a visible save error. System settings and hardware can suppress feedback. Scrolling, text entry, synthetic clicks and disabled controls do not trigger feedback; closely spaced events are throttled. This preference is not part of record backups.

### Profile routes

Profile groups record management, preferences, and data/privacy into child pages. Routes use hash URLs so native bundled assets support refresh and direct entry: `/profile/record-types`, `/profile/supplies`, `/profile/appearance`, `/profile/interaction`, `/profile/backup`, and `/profile/storage`. `state/page-routing.ts` synchronizes page state with browser history. iOS keeps Profile selected throughout these routes. Incoming shared backups open `/profile/backup`, including before a child has been created. The onboarding Settings entry remains available.

### Cloud synchronization

Profile → Data and privacy → Cloud sync connects iCloud Documents or Alipan. The synchronization engine tracks entity versions and deletion tombstones, preserves concurrent edits for explicit resolution, and keeps active timers local. See [cloud synchronization setup and limits](../../../docs/cloud-sync.md) before enabling a provider in a signed build. Live account testing requires registered provider configuration; local tests do not establish connectivity.
