import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'little-days-macos-'));
try {
  execFileSync('pnpm', [
    'tauri', 'icon', join(root, 'packages/brand/assets/little-days/app-icon-macos.png'),
    '--output', output,
  ], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  copyFileSync(join(output, 'icon.icns'), join(root, 'src-tauri/icons/icon.icns'));
} finally {
  rmSync(output, { recursive: true, force: true });
}
