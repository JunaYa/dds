import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const inventory = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], { encoding: 'utf8' }));
const simulator = Object.values(inventory.devices).flat().find(device => device.state === 'Booted');
if (!simulator) throw new Error('Boot an iOS simulator before running pnpm dev:ios:sim.');
const cli = createRequire(import.meta.url).resolve('@tauri-apps/cli/tauri.js');
console.log(`Starting ${simulator.name} with UI hot reload. Keep this process running.`);
const child = spawn(process.execPath, [cli, 'ios', 'dev', simulator.name, '--host', '127.0.0.1', ...process.argv.slice(2)], {
  cwd, stdio: 'inherit', env: { ...process.env, CARGO_PROFILE_DEV_DEBUG: process.env.CARGO_PROFILE_DEV_DEBUG ?? '0', CARGO_INCREMENTAL: process.env.CARGO_INCREMENTAL ?? '0' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exit(1); });
child.on('exit', (code, signal) => process.exit(code ?? (signal === 'SIGINT' ? 0 : 1)));
