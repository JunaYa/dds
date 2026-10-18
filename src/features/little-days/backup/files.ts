import { invoke, isTauri } from "@tauri-apps/api/core";
import { isIosApp } from "../components/layout/ios-platform";

export async function saveBackupFile(text: string) {
  const name = `little-days-${new Date().toISOString().slice(0, 10)}.json`;
  if (isIosApp()) return (await invoke<{ saved: boolean }>("plugin:native-navigation|exportBackup", { text, name })).saved;
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: name });
    if (!path) return false;
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, new TextEncoder().encode(text));
    return true;
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
