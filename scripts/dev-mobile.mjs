import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { androidEnv } from './android-env.mjs';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const env = androidEnv();
const tauriCli = createRequire(import.meta.url).resolve('@tauri-apps/cli/tauri.js');
const adbTarget = env.ANDROID_SERIAL ? ['-s', env.ANDROID_SERIAL] : ['-d'];
const devices = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], { encoding: 'utf8' }));
const simulator = Object.values(devices.devices).flat().find((device) => device.state === 'Booted');
if (!simulator) throw new Error('Boot an iOS simulator in Simulator before running pnpm dev:mobile.');

const children = new Set();
let server;
let stopping = false;
async function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch (error) {
      if (error.code !== 'ESRCH') console.error(error);
    }
  }
  await server?.close();
  process.exit(code);
}
process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', detached: true });
    children.add(child);
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      children.delete(child);
      if (stopping) return resolve();
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal || code}`));
    });
  });
}

const config = JSON.stringify({ build: { beforeDevCommand: '', devUrl: 'http://127.0.0.1:1424' } });
function dev(platform, device) {
  return run(process.execPath, [tauriCli, platform, 'dev', device, '--no-watch', '--host', '127.0.0.1', '--config', config]);
}

try {
  server = await createServer({
    root: cwd,
    server: { host: process.env.MOBILE_DEV_HOST || '127.0.0.1', port: 1424, strictPort: true, ws: { port: 1425 } },
  });
  await server.listen();
  console.log('Shared Vite: http://127.0.0.1:1424 (HMR: 1425)');
  const android = async () => {
    console.log('Waiting for an authorized USB Android device…');
    await run('adb', [...adbTarget, 'wait-for-device']);
    if (stopping) return;
    for (const port of [1424, 1425]) {
      await run('adb', [...adbTarget, 'reverse', `tcp:${port}`, `tcp:${port}`]);
    }
    const model = execFileSync('adb', [...adbTarget, 'shell', 'getprop', 'ro.product.model'], { env, encoding: 'utf8' }).trim();
    await dev('android', model);
  };
  await Promise.all([dev('ios', simulator.name), android()]);
  await stop(0);
} catch (error) {
  console.error(error);
  await stop(1);
}
