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

## Page scrolling check

`ScrollChecks.testEdgesStopWithoutBounceAndFlickStillDecelerates` launches the installed debug app with a temporary long page and an accessibility-only scroll probe. It pulls against both document edges, verifies that native content offsets never exceed the scroll bounds, and checks that the page's custom pull is visible without exceeding its global 40px ceiling before settling back to zero. The actual limit adapts between 24px and 40px to viewport height. A fast flick must produce offset changes while UIKit reports deceleration. It also verifies scrolling remains enabled and saves top/bottom screenshots. No saved records are changed.

Use the command above with `-only-testing:TabChecks/ScrollChecks`. Rebuild the iOS app before running so the debug probe is included. Swift dependencies follow Cargo's debug-info setting: use at least `CARGO_PROFILE_DEV_DEBUG=1`; setting it to `0` compiles out their `DEBUG` sections. The probe is enabled only by `DDS_UI_TEST_SCROLL=1` and is excluded from release builds. Launch normally after the test to remove the temporary page height and probe.

## Modal gesture checks

`ModalChecks.testSheetGesturesAndKeyboard` opens the record chooser, checks a short title drag and a dismissing drag, opens a diaper form, focuses its notes, and cancels without saving records. It also checks that the focused field stays between the header and action bar. It saves chooser, editor, and keyboard screenshots in the result bundle. Add `-only-testing:TabChecks/ModalChecks` to the xcodebuild command to run only this flow.

For the software keyboard case, make sure the full keyboard is visible in Simulator (I/O → Keyboard → Toggle Software Keyboard); the small input accessory bar alone does not verify keyboard occlusion. Inspect the exported keyboard attachment as well as the test assertions.

Modal checks also swipe horizontally and pinch in both directions, checking that title width and horizontal position stay fixed. `ModalChecks.testSiriModalZoomAndPan` covers the Siri confirmation form and cancels without saving. It skips when there is no queued Siri request; use a synthetic request on a test simulator for this case.
