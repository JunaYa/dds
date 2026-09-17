import { afterEach, describe, expect, it, vi } from 'vitest';
import { appearanceSchema, foregroundFor, prepareTypeBackground } from './type-appearance';

afterEach(() => vi.restoreAllMocks());

describe('type backgrounds', () => {
  it('chooses readable text on light and dark custom colors', () => {
    expect(foregroundFor('#ffffff')).toBe('#000000');
    expect(foregroundFor('#283E39')).toBe('#ffffff');
    expect(foregroundFor('#DFEAE2')).toBe('#000000');
  });
  it('rejects unsupported, oversized and external image backgrounds', async () => {
    await expect(
      prepareTypeBackground(new File(['x'], 'x.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('JPG');
    const large = new File(['x'], 'x.png', { type: 'image/png' });
    Object.defineProperty(large, 'size', { value: 11 * 1024 * 1024 });
    await expect(prepareTypeBackground(large)).rejects.toThrow('10 MB');
    expect(
      appearanceSchema.safeParse({
        icon: 'image',
        background: { kind: 'image', value: 'data:image/svg+xml;base64,PHN2Zz4=' },
      }).success,
    ).toBe(false);
    expect(
      appearanceSchema.safeParse({
        icon: 'book',
        background: { kind: 'color', value: 'url(https://example.com)' },
      }).success,
    ).toBe(false);
  });
});
