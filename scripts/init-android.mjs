import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { androidEnv } from './android-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tauriCli = createRequire(import.meta.url).resolve('@tauri-apps/cli/tauri.js');
const result = spawnSync(
  process.execPath,
  [tauriCli, 'android', 'init', '--ci'],
  { cwd: root, env: androidEnv(), stdio: 'inherit' },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const manifest = resolve(root, 'src-tauri/gen/android/app/src/main/AndroidManifest.xml');
const xml = await readFile(manifest, 'utf8');
if (!xml.includes('android.media.action.IMAGE_CAPTURE')) {
  const addition = `    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <queries>
        <intent><action android:name="android.media.action.IMAGE_CAPTURE" /></intent>
    </queries>
`;
  if (!xml.includes('    <application'))
    throw new Error('Android manifest application element not found');
  await writeFile(manifest, xml.replace('    <application', `${addition}    <application`));
}
console.log('Android project ready, including the system camera intent.');
