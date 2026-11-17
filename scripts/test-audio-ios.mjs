import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
  return result;
}
const inventory = JSON.parse(run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], { encoding: 'utf8', stdio: 'pipe' }).stdout);
const device = Object.values(inventory.devices).flat().find(device => device.state === 'Booted');
if (!device) throw new Error('Boot an iOS simulator before running native audio tests.');
const directory = await mkdtemp(join(tmpdir(), 'little-days-audio-tests-'));
const runtime = resolve('src-tauri/plugins/audio-player/ios/Sources/AudioRuntime.swift');
const bridge = resolve('src-tauri/plugins/audio-player/ios/include/AudioBridge.h');
const tests = resolve('src-tauri/plugins/audio-player/ios/Tests/AudioRuntimeTests.swift');
await writeFile(join(directory, 'Host.swift'), `import UIKit
@main final class AudioTestDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = UIViewController()
        window?.makeKeyAndVisible()
        return true
    }
}
`);
const spec = {
  name: 'AudioTestHost', options: { deploymentTarget: { iOS: '16.4' } },
  settings: { base: { SWIFT_VERSION: '5.0', CODE_SIGNING_ALLOWED: 'NO', GENERATE_INFOPLIST_FILE: 'YES', ENABLE_TESTABILITY: 'YES', SWIFT_OBJC_BRIDGING_HEADER: bridge } },
  targets: {
    AudioTestHost: { type: 'application', platform: 'iOS', sources: [runtime, 'Host.swift'],
      settings: { base: { PRODUCT_BUNDLE_IDENTIFIER: 'com.dds.audio.tests', INFOPLIST_KEY_UIBackgroundModes: ['audio'] } } },
    AudioRuntimeTests: { type: 'bundle.unit-test', platform: 'iOS', sources: [tests], dependencies: [{ target: 'AudioTestHost' }],
      settings: { base: { PRODUCT_BUNDLE_IDENTIFIER: 'com.dds.audio.tests.unit', TEST_HOST: '$(BUILT_PRODUCTS_DIR)/AudioTestHost.app/AudioTestHost', BUNDLE_LOADER: '$(TEST_HOST)' } } },
  },
  schemes: { AudioTestHost: { build: { targets: { AudioTestHost: 'all', AudioRuntimeTests: 'test' } }, test: { targets: ['AudioRuntimeTests'] } } },
};
await writeFile(join(directory, 'project.json'), JSON.stringify(spec));
run('xcodegen', ['generate', '--spec', join(directory, 'project.json')]);
run('xcodebuild', ['test', '-quiet', '-project', join(directory, 'AudioTestHost.xcodeproj'), '-scheme', 'AudioTestHost', '-destination', `platform=iOS Simulator,id=${device.udid}`, '-derivedDataPath', join(directory, 'build'), 'CODE_SIGNING_ALLOWED=NO']);

console.log("Native audio tests passed.");
await rm(directory, { recursive: true, force: true });
