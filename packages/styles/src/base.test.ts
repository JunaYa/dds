import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(path), 'utf8');

describe('DDS shared styles integration', () => {
  it('loads the shared baseline from the application entry', () => {
    expect(read('src/styles.css')).toContain('@import "@vita/styles/base.css"');
    expect(read('src/main.tsx')).toContain('./styles.css');
  });

  it('includes the token layers and scans each imported component package', () => {
    const base = read('packages/styles/src/base.css');
    expect(base).toContain('@import "@vita/tokens/css"');
    for (const path of ['../../ui/src', '../../brand/src/react.tsx', '../../iconography/src']) {
      expect(base).toContain(path);
    }
    const baseline = read('packages/styles/src/baseline.css');
    for (const dependency of ['tailwindcss', 'tw-animate-css', 'shadcn/tailwind.css']) {
      expect(baseline).toContain(`@import "${dependency}"`);
    }
  });
});
