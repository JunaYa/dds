# System tab integration check

Requires Xcode 26+, XcodeGen, a booted iOS 26 iPhone simulator with English system language, and the debug Little days app installed with at least one child profile. App language can be English or Chinese. The test switches pages without changing saved records.

From the repository root, after `pnpm build:ios:sim` and installing the resulting app on the simulator:

```sh
tab_checks_dir=$(mktemp -d)
cp -R src-tauri/plugins/native-navigation/ios/UITests/. "$tab_checks_dir/"
xcodegen generate --spec "$tab_checks_dir/project.yml"
xcodebuild test -project "$tab_checks_dir/TabChecks.xcodeproj" \
  -scheme TabChecks -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

The test checks all three native selections, scroll minimization and expansion, and captures expanded/collapsed screenshots in the Xcode result bundle. `DDS_UI_TEST_LONG_PAGE=1` adds temporary document height in DEBUG builds so UIKit's content-length heuristic does not prevent minimization on a nearly empty profile. It does not change saved data and is absent from release builds. Launch the app normally after the test to restore its normal document height.

If changing this standalone test runner repeatedly, uninstall only `com.dds.checks.TabChecks.xctrunner` before the next run to avoid reusing a stale test runner. Do not uninstall the Little days app, which contains user data.
