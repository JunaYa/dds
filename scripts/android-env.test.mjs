import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { androidEnv } from './android-env.mjs';

function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'android-env-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const brew = join(home, 'brew');
  const sdk = join(brew, 'share/android-commandlinetools');
  const ndk = join(sdk, 'ndk/28.2.13676358');
  mkdirSync(join(home, 'Library/Android/sdk/cmdline-tools'), { recursive: true });
  mkdirSync(join(sdk, 'platforms'), { recursive: true });
  mkdirSync(join(ndk, 'toolchains/llvm/prebuilt'), { recursive: true });
  writeFileSync(join(ndk, 'source.properties'), 'Pkg.Revision = 28.2.13676358');
  mkdirSync(join(sdk, 'ndk/29.0.0.failed-install'), { recursive: true });
  const java = join(brew, 'opt/openjdk@17/libexec/openjdk.jdk/Contents/Home');
  mkdirSync(join(java, 'bin'), { recursive: true });
  writeFileSync(join(java, 'bin/java'), '');
  return { home, sdk, ndk, java, brew };
}

test('finds Homebrew NDK when the default SDK only contains command-line tools', (t) => {
  const f = fixture(t);
  const env = androidEnv({ HOMEBREW_PREFIX: f.brew, PATH: '/usr/bin' }, { home: f.home, platform: 'darwin' });
  assert.equal(env.ANDROID_HOME, f.sdk);
  assert.equal(env.NDK_HOME, f.ndk);
  assert.equal(env.JAVA_HOME, f.java);
  assert.ok(env.PATH.startsWith(join(f.java, 'bin')));
});

test('preserves explicitly selected toolchains', (t) => {
  const f = fixture(t);
  const env = androidEnv({ ANDROID_HOME: f.sdk, NDK_HOME: f.ndk, JAVA_HOME: f.java }, { home: f.home });
  assert.equal(env.ANDROID_HOME, f.sdk);
  assert.equal(env.NDK_HOME, f.ndk);
  assert.equal(env.JAVA_HOME, f.java);
});

test('does not replace an explicitly selected SDK that is missing its NDK', (t) => {
  const f = fixture(t);
  assert.throws(() => androidEnv({ ANDROID_HOME: join(f.home, 'Library/Android/sdk'), HOMEBREW_PREFIX: f.brew }, { home: f.home, platform: 'darwin' }), /NDK/);
});

test('supports ANDROID_SDK_ROOT and ignores incomplete NDK installs', (t) => {
  const f = fixture(t);
  const env = androidEnv({ ANDROID_SDK_ROOT: f.sdk }, { home: f.home });
  assert.equal(env.ANDROID_HOME, f.sdk);
  assert.equal(env.NDK_HOME, f.ndk);
});

test('an explicit NDK does not cause detection to select a tools-only SDK', (t) => {
  const f = fixture(t);
  const env = androidEnv({ NDK_HOME: f.ndk, HOMEBREW_PREFIX: f.brew }, { home: f.home, platform: 'darwin' });
  assert.equal(env.ANDROID_HOME, f.sdk);
  assert.equal(env.NDK_HOME, f.ndk);
});
