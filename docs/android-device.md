# Android physical-device development

Little days uses the root application entry. Android packages contain the built frontend and do not need a Vite server when built with `tauri android build`.

## Toolchain detection

`pnpm init:android`, `pnpm dev:android`, and `pnpm build:android` detect installed SDK/NDK paths for each invocation. Explicit `ANDROID_HOME` (or `ANDROID_SDK_ROOT`), `NDK_HOME`, and `JAVA_HOME` values take priority. With no explicit SDK, detection searches the standard user SDK location and, on macOS, Homebrew locations for an installed NDK. Incomplete NDK installation directories are ignored. On macOS, Homebrew Java 17 is selected when `JAVA_HOME` is unset.

No shell configuration is modified. On this Mac, the commands work without the manual exports below; those remain useful for direct Tauri or ADB commands and custom installations.

## This Mac's toolchain

Homebrew provides Java 17, Android command-line tools, and platform-tools. The Android SDK license was accepted by the developer during setup.

```sh
export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$(brew --prefix)/share/android-commandlinetools"
export NDK_HOME="$ANDROID_HOME/ndk/28.2.13676358"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Required packages: Android SDK Platform 36, Build Tools 36.0.0, NDK 28.2.13676358. Existing native plugins also request Platform 34 and Build Tools 35.0.0; Gradle installs these after the SDK license has been accepted. Set the environment variables in the terminal running the commands; no global shell settings need to change.

## Initialize and build

```sh
pnpm init:android
CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0 pnpm build:android --debug --target aarch64 --apk
```

The reduced Rust debug settings conserve disk space. This is a debug-signed development package, not a store release. Gradle and Rust download dependencies on the first build.

## Install and launch

Connect the phone by USB, enable USB debugging, and accept the computer's debugging key on the phone. `adb devices -l` must show `device`, not `unauthorized`.

```sh
adb devices -l
# Use the APK path reported by the successful build:
adb -s <device-serial> install -r <apk-path>
adb -s <device-serial> shell am start -n com.dds.app/.MainActivity
```

Some manufacturers also ask for confirmation on the phone for USB installation. Preserve existing app data by using `install -r`; do not uninstall to bypass a signature conflict without deciding how to preserve the data first.

For live development instead of a standalone APK, use `pnpm dev:android` with the same environment.

## Verified device run

On September 19, 2026, the ARM64 debug APK was installed on a vivo Y78t (V2312BA, Android 13). `am start -W` returned `Status: ok`, and `dumpsys activity` confirmed `com.dds.app/.MainActivity` as the visible, resumed activity. Startup logs showed no application crash. This verifies installation and native startup, not every recording flow.

APK: `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` (version 0.1.0).

The app Gradle configuration includes a compatibility fix for Wry 0.48: SDK 36 treats `PackageInfo.versionName` as nullable. Kotlin compilation waits for Rust source generation, then adds the same empty-string fallback used elsewhere in Wry's version getter. Keep this fix when regenerating the Android host; remove it when upgrading to a Wry version that handles the nullable value itself.

If this Mac's existing proxy is needed for Gradle downloads, use a command-scoped setting:

```sh
GRADLE_OPTS='-Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=7897 -Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=7897 -Dhttp.nonProxyHosts=localhost' \
  CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0 CARGO_BUILD_JOBS=4 \
  pnpm build:android --debug --target aarch64 --apk
```
