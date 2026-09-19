import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

function isNdk(path) {
  return path && existsSync(join(path, 'source.properties')) &&
    existsSync(join(path, 'toolchains/llvm/prebuilt'));
}

function installedNdk(sdk) {
  const directory = join(sdk, 'ndk');
  if (!existsSync(directory)) return undefined;
  return readdirSync(directory)
    .filter((name) => /^\d+(\.\d+)+$/.test(name))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map((name) => join(directory, name))
    .find(isNdk);
}

export function androidEnv(env = process.env, { home = homedir(), platform = process.platform } = {}) {
  const brewRoots = [...new Set([env.HOMEBREW_PREFIX, '/opt/homebrew', '/usr/local'].filter(Boolean))];
  const candidates = platform === 'darwin'
    ? [join(home, 'Library/Android/sdk'), ...brewRoots.map((root) => join(root, 'share/android-commandlinetools'))]
    : platform === 'win32'
      ? [join(env.LOCALAPPDATA || join(home, 'AppData/Local'), 'Android/Sdk')]
      : [join(home, 'Android/Sdk'), '/opt/android-sdk', '/usr/lib/android-sdk'];
  const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT ||
    candidates.find((path) => existsSync(join(path, 'platforms')) && (isNdk(env.NDK_HOME) || installedNdk(path)));
  if (!sdk || !existsSync(sdk)) {
    throw new Error('Android SDK with NDK not found. Install the SDK/NDK and set ANDROID_HOME and NDK_HOME. See docs/android-device.md.');
  }
  const ndk = env.NDK_HOME || installedNdk(sdk);
  if (!isNdk(ndk)) {
    throw new Error(`Android NDK not found for ${sdk}. Install an NDK under this SDK or set NDK_HOME to its installation directory.`);
  }
  const java = env.JAVA_HOME || (platform === 'darwin'
    ? brewRoots.map((root) => join(root, 'opt/openjdk@17/libexec/openjdk.jdk/Contents/Home'))
      .find((path) => existsSync(join(path, 'bin/java')))
    : undefined);
  return {
    ...env,
    ANDROID_HOME: sdk,
    NDK_HOME: ndk,
    ...(java ? { JAVA_HOME: java } : {}),
    PATH: [java && join(java, 'bin'), join(sdk, 'platform-tools'), env.PATH].filter(Boolean).join(delimiter),
  };
}
