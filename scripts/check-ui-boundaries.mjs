import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const violations = [];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await inspect(file);
    else if (/\.tsx$/.test(file) && !/\.(test|stories)\.tsx$/.test(file)) {
      const source = await readFile(file, 'utf8');
      for (const [index, line] of source.split('\n').entries()) {
        if (/<(?:button|input|textarea|select|dialog)\b/.test(line) || /from\s+['"]@(?:base-ui|radix-ui)\//.test(line)) {
          violations.push(`${path.relative(root, file)}:${index + 1}: use a shared packages component`);
        }
      }
    }
  }
}
await inspect(root);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else console.log('Shared UI boundaries passed.');
