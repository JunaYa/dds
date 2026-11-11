# WebView background check

Requires Xcode, XcodeGen and a booted iOS simulator. This standalone test host loads a real WKWebView and verifies that page, scroll, under-page and ancestor backgrounds follow dark and light theme colors without changing the supplied bounce setting. A separate test checks that closing overlapping modals preserves disabled page bouncing, normal scrolling and its deceleration rate. It does not change the installed Little days app or its records.

From this directory:

```sh
xcodegen generate
xcodebuild test -project BackgroundCheck.xcodeproj -scheme BackgroundCheck \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath /tmp/dds-background-derived -parallel-testing-enabled NO
```

Keep generated Xcode projects out of commits. After rebuilding the Little days iOS app, scroll to both ends of a long page in light and dark mode and check that content stops at the edge without rubber-banding. Normal scrolling and inertial deceleration must still work. Repeat after changing tabs and after opening and closing a form. This integration check does not replace that device verification.
