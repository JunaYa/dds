import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync('pnpm', [
  'tauri', 'icon', 'packages/brand/assets/little-days/app-icon.png',
  '--ios-color', '#FFF4E4',
], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
copyFileSync(
  new URL('../src-tauri/icons/128x128.png', import.meta.url),
  new URL('../src/assets/icon.png', import.meta.url),
);

const trayOutput = mkdtempSync(join(tmpdir(), 'little-days-tray-'));
try {
  execFileSync('pnpm', [
    'tauri', 'icon', 'packages/brand/assets/little-days/tray-white.png',
    '--png', '32', '--output', trayOutput,
  ], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  copyFileSync(join(trayOutput, '32x32.png'), join(root, 'src-tauri/icons/tray-white.png'));
} finally {
  rmSync(trayOutput, { recursive: true, force: true });
}

// Tauri 2.11 emits 49px legacy hdpi launchers; Android needs 72px.
const android = join(root, 'src-tauri/gen/android/app/src/main/res');
if (existsSync(android)) {
  const output = mkdtempSync(join(tmpdir(), 'little-days-icons-'));
  try {
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
      execFileSync('pnpm', [
        'tauri', 'icon', join(android, `mipmap-xxxhdpi/${name}.png`),
        '--png', '72', '--output', output,
      ], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
      copyFileSync(join(output, '72x72.png'), join(android, `mipmap-hdpi/${name}.png`));
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

await import('./generate-macos-icon.mjs');
