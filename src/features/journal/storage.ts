import {
  applyAction,
  createInitialState,
  stateSchema,
  type Action,
  type Attachment,
  type JournalState,
} from './model';
export type PendingFile = { attachment: Attachment; blob: Blob };
export type JournalDatabase = 'app' | 'example';
export const databaseName = (mode: JournalDatabase) =>
  mode === 'example' ? 'dds-journal-example' : 'dds-journal';

export function openDatabase(mode: JournalDatabase = 'app'): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName(mode), 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('state');
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭旧版本的应用窗口，再重试'));
  });
}

export async function readState(mode: JournalDatabase = 'app'): Promise<JournalState> {
  const db = await openDatabase(mode);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    const request = tx.objectStore('state').get('journal');
    let state: JournalState, error: unknown;
    request.onsuccess = () => {
      try {
        state =
          request.result === undefined
            ? createInitialState(new Date(), mode === 'example')
            : stateSchema.parse(request.result);
        if (request.result === undefined) tx.objectStore('state').put(state, 'journal');
      } catch (cause) {
        error = cause;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(state);
    };
    tx.onabort = () => {
      db.close();
      reject(error || tx.error || new Error('无法读取记录，原有数据未被覆盖'));
    };
  });
}

export async function persistAction(
  action: Action,
  files: PendingFile[] = [],
  mode: JournalDatabase = 'app',
): Promise<JournalState> {
  const db = await openDatabase(mode);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'files'], 'readwrite');
    const request = tx.objectStore('state').get('journal');
    let next: JournalState, error: unknown;
    request.onsuccess = () => {
      try {
        const current = stateSchema.parse(request.result);
        next = applyAction(current, action);
        if (next === current) return;
        for (const { attachment, blob } of files) {
          if (blob.size > 20 * 1024 * 1024) throw new Error('单个附件不能超过 20 MB');
          tx.objectStore('files').put(blob, attachment.id);
        }
        tx.objectStore('state').put(next, 'journal');
      } catch (cause) {
        error = cause;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(next);
    };
    tx.onabort = () => {
      db.close();
      reject(error || tx.error || new Error('保存失败，草稿仍然保留，请重试'));
    };
  });
}

export async function readFile(id: string, mode: JournalDatabase = 'app'): Promise<Blob> {
  const db = await openDatabase(mode);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files');
    const request = tx.objectStore('files').get(id);
    request.onsuccess = () =>
      request.result ? resolve(request.result) : reject(new Error('附件不可用'));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
