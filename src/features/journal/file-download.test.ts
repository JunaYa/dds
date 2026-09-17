// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { saveNativeFile } from './file-download';

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it('does not read or write the attachment if the native picker is cancelled', async () => {
  vi.mocked(save).mockResolvedValue(null);
  const read = vi.fn();
  expect(await saveNativeFile('photo.png', read)).toBe(false);
  expect(read).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
});

it('writes attachment bytes to the exact URI selected by the system picker', async () => {
  vi.mocked(save).mockResolvedValue('content://documents/selected-photo');
  const blob = new Blob([new Uint8Array([1, 2, 3])]);
  expect(await saveNativeFile('photo.png', async () => blob)).toBe(true);
  expect(writeFile).toHaveBeenCalledWith(
    'content://documents/selected-photo',
    new Uint8Array([1, 2, 3]),
  );
});

it('propagates filesystem failures so the UI can report them', async () => {
  vi.mocked(save).mockResolvedValue('file:///chosen/photo.png');
  vi.mocked(writeFile).mockRejectedValue(new Error('存储空间不足'));
  await expect(saveNativeFile('photo.png', async () => new Blob(['x']))).rejects.toThrow(
    '存储空间不足',
  );
});
