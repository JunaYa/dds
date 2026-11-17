import type { AudioState } from "./model";
export function projectedPosition(state: AudioState, elapsedMs: number): number {
  if (!state.playing || state.buffering) return state.position;
  const position = state.position + Math.min(2000, Math.max(0, elapsedMs)) / 1000;
  if (state.duration <= 0) return position;
  return state.repeat ? position % state.duration : Math.min(position, state.duration);
}
