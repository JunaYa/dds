import { isTauri } from "@tauri-apps/api/core";

export function isIosApp() {
  return isTauri() && (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
