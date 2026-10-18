# Cross-app backup sharing test

Build and install Little days (`com.dds.app`) on an iOS simulator first. Copy this directory outside the repository, run `xcodegen generate`, build/install the ShareHost app, then run the ShareHost scheme's tests with `xcodebuild test -destination 'platform=iOS Simulator,id=…'`.

The helper shares a synthetic Cali-format backup through UIActivityViewController. The test checks the system share destination, cold-start delivery, retained preview after relaunch, and explicit cancellation. It never imports the fixture into the user's workspace. The fixture contains no personal data.
