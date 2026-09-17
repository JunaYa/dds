import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorker, type Worker } from 'tesseract.js';
import { recognizeImage } from './ocr';

vi.mock('tesseract.js', () => ({ createWorker: vi.fn() }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OCR cancellation', () => {
  it('settles cancellation while initializing and disposes a worker that arrives late', async () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:test-image', revokeObjectURL: revoke });
    let finish!: (worker: Worker) => void;
    vi.mocked(createWorker).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const controller = new AbortController();
    const result = recognizeImage(new File(['image'], 'image.png'), controller.signal, vi.fn());
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(finish).toBeDefined());
    controller.abort();
    await rejected;
    expect(revoke).toHaveBeenCalledWith('blob:test-image');
    const terminate = vi.fn().mockResolvedValue(undefined);
    finish({ terminate } as unknown as Worker);
    await vi.waitFor(() => expect(terminate).toHaveBeenCalled());
  });
});
