import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const configPath = new URL('../cloud-sync.config.local.json', import.meta.url);
const container = process.argv[2] ?? JSON.parse(readFileSync(configPath, 'utf8')).providers?.icloud?.containerId;
if (!container || !/^iCloud\.[a-zA-Z0-9.-]+$/.test(container)) {
  throw new Error('Usage: node scripts/configure-icloud.mjs iCloud.<your.registered.container>');
}
const root = fileURLToPath(new URL('../src-tauri/gen/apple/', import.meta.url));
const entitlementPath = `${root}dds_iOS/dds_iOS.entitlements`;
const values = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', entitlementPath], { encoding: 'utf8' }));
Object.assign(values, {
  'com.apple.developer.icloud-services': ['CloudDocuments'],
  'com.apple.developer.icloud-container-identifiers': [container],
  'com.apple.developer.ubiquity-container-identifiers': [container],
});
const keys = ['com.apple.developer.icloud-services', 'com.apple.developer.icloud-container-identifiers', 'com.apple.developer.ubiquity-container-identifiers'];
let project = readFileSync(`${root}project.yml`, 'utf8');
// Preserve other generated project settings and entitlement properties.
if (!project.includes('    entitlements:\n      path: dds_iOS/dds_iOS.entitlements')) throw new Error('Unrecognized Apple project layout');
for (const key of keys) project = project.replace(new RegExp(`^        ${key.replaceAll('.', '\\.')}:.+\\n`, 'gm'), '');
const block = '    entitlements:\n      path: dds_iOS/dds_iOS.entitlements';
if (!project.includes(`${block}\n      properties:`)) project = project.replace(block, `${block}\n      properties:`);
project = project.replace(`${block}\n      properties:`, `${block}\n      properties:\n${keys.map(key => `        ${key}: ${JSON.stringify(values[key])}`).join('\n')}`);
writeFileSync(entitlementPath, JSON.stringify(values));
execFileSync('plutil', ['-convert', 'xml1', entitlementPath]);
writeFileSync(`${root}project.yml`, project);
console.log(`Configured ${container}. Enable iCloud Documents for this App ID in the Apple Developer account and regenerate its provisioning profile before signing.`);
