import workerPath from 'tesseract.js/dist/worker.min.js?url';
import type { Worker } from 'tesseract.js';

function abortable<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Recognition cancelled', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    pending.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (cause) => {
        signal.removeEventListener('abort', abort);
        reject(cause);
      },
    );
  });
}

export async function recognizeImage(
  file: File,
  signal: AbortSignal,
  progress: (value: number) => void,
): Promise<string> {
  let worker: Worker | undefined;
  const url = URL.createObjectURL(file);
  const stop = () => {
    void worker?.terminate();
  };
  signal.addEventListener('abort', stop, { once: true });
  try {
    const { createWorker } = await import('tesseract.js');
    signal.throwIfAborted();
    const pendingWorker = createWorker(['chi_sim', 'eng'], 1, {
      workerPath,
      errorHandler: () => {},
      logger: (event) => {
        if (!signal.aborted)
          progress(
            Math.round(
              (event.status === 'recognizing text'
                ? 0.5 + event.progress * 0.5
                : event.progress * 0.45) * 100,
            ),
          );
      },
    });
    void pendingWorker.then(
      (created) => {
        if (signal.aborted) void created.terminate();
      },
      () => {},
    );
    worker = await abortable(pendingWorker, signal);
    signal.throwIfAborted();
    const image = new Image();
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    const scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法处理图片');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = await abortable(worker.recognize(canvas), signal);
    signal.throwIfAborted();
    return result.data.text.trim();
  } finally {
    signal.removeEventListener('abort', stop);
    void worker?.terminate();
    URL.revokeObjectURL(url);
  }
}
