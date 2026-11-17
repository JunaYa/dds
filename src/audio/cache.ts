const database = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("little-days-audio", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("files");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
export async function cachedAudio(id: string, action: "get" | "put" | "delete", blob?: Blob): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("files", action === "get" ? "readonly" : "readwrite");
      const store = tx.objectStore("files");
      const request = action === "put" ? store.put(blob, id) : action === "delete" ? store.delete(id) : store.get(id);
      tx.oncomplete = () => resolve(action === "get" ? request.result as Blob | undefined : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Audio cache transaction aborted"));
    });
  } finally { db.close(); }
}
