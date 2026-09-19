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
