# Cloud synchronization

Profile → Data and privacy → Cloud sync enables multi-device synchronization. Before creating a child, Settings also exposes Cloud sync. The user explicitly opts in before local records are uploaded. iOS defaults to iCloud; Alipan is available on native platforms. Accounts on different providers are separate stores, not a cross-cloud bridge. Using Alipan on both platforms allows cross-platform synchronization.

## Architecture and adding a provider

The implementation uses a **strategy interface with provider adapters and a registry**:

- `sync/engine.ts` owns causal merging, deletion and conflict rules. It has no provider dependencies.
- `SyncProvider.tsx` schedules synchronization, pins the account and applies changes atomically.
- `sync/transport.ts` validates the common native transport responses. Every command, including authorization and disconnect, explicitly identifies its provider.
- `sync/providers.ts` registers UI labels, supported platforms and authorization capabilities. The settings page renders those capabilities rather than branching on provider IDs.
- Native `providers/CloudProvider` defines status, pull, push and optional authorization operations. `providers::get` selects the adapter. Alipan delegates to its OAuth/file API implementation; iCloud delegates to its native document implementation.

To add a cloud: implement and register a native adapter, register its UI definition, add its typed build configuration if needed, and add provider contract tests. No changes to the merge engine or scheduler are needed. A new authorization flow (such as browser redirect rather than QR) also needs a corresponding UI capability. Keep tokens in provider-specific secure storage; the existing Alipan credential helpers are Alipan-only. Never reuse another provider's token slot.

Adapter contract: return `{configured, connected, account?, expiresAt?}` for status, `{account, snapshots: string[]}` for pull, and reject account changes or incomplete/invalid data. Push must durably accept an immutable snapshot with safe retry semantics. The engine validates snapshot schemas and causal metadata. Do not silently truncate history or translate provider failures into an empty successful pull.

## Local configuration

No registration is needed to build or run the local application. Copy the template once:

```sh
cp cloud-sync.config.example.json cloud-sync.config.local.json
```

Leave unavailable values empty. After registration, fill in `providers.alipan.clientId` and/or `providers.icloud.containerId`. This local file is gitignored; it contains **public registration identifiers only**, never a client secret or access token. Invalid keys, versions and identifier values fail the native build instead of silently disabling sync.

Alipan's App ID is read by the native build automatically. The existing `LITTLE_DAYS_ALIPAN_CLIENT_ID` environment variable takes precedence for CI. Restart the development build or rebuild the installed app after changing configuration.

For iCloud, run `node scripts/configure-icloud.mjs` after filling in the container ID. The script reads the same file and applies the required Apple entitlements; the explicit container argument remains supported. Apple capability registration and a valid provisioning profile are still required. Configuration cannot create or approve provider accounts.

## Provisioning

### iCloud Documents

Use a registered App ID and an Apple Developer membership that supports iCloud. The existing unconfigured development build intentionally reports that iCloud is unavailable instead of falling back to local files.

1. Enable iCloud Documents for the app's App ID in Apple Developer / Xcode Signing & Capabilities.
2. Create or select the app's registered ubiquity container. Use the same container and signing team on every participating device.
3. Run `node scripts/configure-icloud.mjs iCloud.<your.registered.container>` from the repository root. This updates the generated target entitlements and the XcodeGen source without replacing unrelated settings.
4. Regenerate the signing/provisioning profile and build/install the app. If `tauri ios init` regenerates the Apple project, rerun the configuration script.
5. Sign the test devices into the same iCloud account, enable iCloud Drive, and explicitly enable synchronization in Profile.

The adapter uses `NSMetadataQuery` to discover files, requests downloads for pending items, and uses `NSFileCoordinator` for reads/writes. It checks the current iCloud identity before reading and writing. A successful local file write means the revision was handed to iCloud; it does not prove another device has downloaded it. Background execution is not guaranteed: the app syncs while open and on foreground return.

### Alipan public-client application

Register **your own** app in the [Alipan developer portal](https://www.alipan.com/developer) and enable its public-client authorization mode. Build with the non-secret application ID in the environment:

```sh
LITTLE_DAYS_ALIPAN_CLIENT_ID=<your-app-id> pnpm build:desktop
LITTLE_DAYS_ALIPAN_CLIENT_ID=<your-app-id> pnpm build:android --debug --target aarch64
```

No application secret or third-party application's client ID is embedded. QR authorization uses OAuth PKCE S256. Public-client access tokens last 30 days and are not refreshable; reconnect after expiry. The code requests the documented folder authorization UI and operates only inside `Little-days-sync-v1` in the selected authorized root. Without an App ID, the app shows a configuration message and disables authorization.

Credentials never enter localStorage, backups, or JavaScript responses. Desktop uses the OS credential store (`keyring`), iOS uses a non-synchronizing ThisDeviceOnly Keychain item, and Android encrypts the token with an Android Keystore AES-GCM key in `noBackupFilesDir`. Keychain/keyring failures stop connection; there is no plaintext fallback. Disconnect removes this device's stored token; revocation of the application grant is managed in Alipan.

Official references (checked 2026-10-18):

- [Public-client authorization](https://www.yuque.com/aliyundrive/zpfszx/eam8ls1lmawwwksv)
- [QR authorization](https://www.yuque.com/aliyundrive/zpfszx/ttfoy0xt2pza8lof)
- [Drive/account information](https://www.yuque.com/aliyundrive/zpfszx/mbb50w)
- [File listing](https://www.yuque.com/aliyundrive/zpfszx/zqkqp6)
- [File download](https://www.yuque.com/aliyundrive/zpfszx/gogo34oi2gy98w5d)
- [File creation/upload/completion](https://www.yuque.com/aliyundrive/zpfszx/ezlzok)
- [Apple iCloud configuration](https://developer.apple.com/documentation/xcode/configuring-icloud-services)

## Data model and failure behavior

`sync/engine.ts` implements state-based multi-value registers for each child, type, record and supply, with replica counters and a version vector. It does not use wall-clock ordering. Independent edits merge, observed superseded values disappear, and deletion values remain as tombstones. Concurrent changes to the same entity remain visible as conflict alternatives. Choices refer to stable version identities, not an index that could change during another sync.

The sync metadata and user data are written together in the existing workspace localStorage value. Ordinary edits update their causal metadata in the same write, including imports/restores and quick-record changes. Device-selected child, language, theme, haptics and active timers are not synchronized. Portable backup exports omit cloud-account and replica metadata. Existing workspaces migrate only after the user enables cloud sync.

The runner reads cloud revisions first, then merges against the **latest** local snapshot, so edits made during a download are retained. It saves merged data before upload. Conflicts or invalid cross-record references preserve the current visible workspace and the competing metadata, with explicit resolution controls. Cloud account changes stop synchronization. Applying changes is deferred while a record modal or timer is active. A pre-sync recovery copy can be exported from the sync page and imported via Backup and restore.

Cloud objects are immutable, content-addressed full states. No device overwrites or purges another device's revision. A failed upload can be retried; partially uploaded Alipan files are not merged. iCloud hashes and Alipan downloaded content are checked before use. The transfer client rejects redirects and unexpected object-storage hosts and never forwards the OAuth token to signed download/upload URLs.

A debounce sends local edits; a 30-second foreground poll finds remote edits. Network failures back off to at most five minutes, and no successful-sync status is recorded until transfer succeeds. Pausing prevents future apply/upload steps; a request already sent to the cloud may still complete.

## Current limits

- Real-account end-to-end validation requires the registered iCloud container and Alipan App ID. Passing local tests or a simulator build does not establish live cloud connectivity.
- One active provider/account per workspace; no automatic iCloud-to-Alipan bridge.
- Existing localStorage capacity still limits records plus sync metadata, including inline photos. A full disk/quota failure blocks the write without replacing the current workspace.
- One state is limited to 20 MiB, a pull to 100 MiB and 1,000 unique state files. The native Alipan listing limit is 5,000 entries. These are explicit errors, not truncation. History compaction and large-photo blob storage are not implemented; this first version must not be advertised as unlimited synchronization.
- Tombstones and immutable history are retained to protect long-offline devices. Do not manually delete sync-folder files as a way to delete records; delete records inside the app.
- Replica identity is separate from exported backups. Cloning an entire app data directory onto another active device is not supported; use app backup import instead.
- iOS cannot guarantee continuous sync while suspended or terminated. Windows/Linux credential-store integration and real-device Android authorization need platform validation.

## Verification

Tests cover three-way convergence, idempotence, edit/delete conflicts, stale-replica deletion replay, structural reference conflicts, portable backups, edits during download, pause during download, account mismatch and network failures. Native unit tests reject unsafe object URLs and malformed filenames.

Live acceptance test with synthetic data: connect two clean devices to one provider/account, create independent records offline, reconnect, edit the same record on both while offline, resolve the conflict, delete on one and reconnect a stale third replica, switch cloud accounts, expire/revoke authorization, and retry an interrupted upload. Repeat with photos and verify exported recovery copies. Do not use personal baby records for initial provider validation.
