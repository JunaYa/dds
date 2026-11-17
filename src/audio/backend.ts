import { invoke, isTauri } from "@tauri-apps/api/core";
import type { AudioBackend, AudioState } from "./model";
import { WebAudioBackend } from "./web";
export const nativeAudio = () => isTauri();
let backend: AudioBackend | undefined;
export function audioBackend(): AudioBackend {
  return backend ??= isTauri() ? {
    snapshot: () => invoke<AudioState>("plugin:audio-player|snapshot"),
    execute: command => invoke<AudioState>("plugin:audio-player|execute", { command }),
  } : new WebAudioBackend();
}
