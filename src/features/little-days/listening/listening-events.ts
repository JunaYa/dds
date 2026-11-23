import type { Track } from "~/audio/model";

export function openListening(category: Track["category"]) {
  window.dispatchEvent(new CustomEvent("little-days-listening", { detail: category }));
}
export function openPlayer() {
  window.dispatchEvent(new Event("little-days-player"));
}
