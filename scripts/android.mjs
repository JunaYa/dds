import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { androidEnv } from './android-env.mjs';

const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'tauri', 'android', ...process.argv.slice(2)],
  {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: androidEnv(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
