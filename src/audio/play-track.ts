import { trackSchema, type AudioCommand, type Track } from "./model";

export async function playTrack(track: Track, send: (command: AudioCommand) => Promise<boolean>, isCurrent = () => true) {
  if (!await send({ op: "catalog", tracks: [trackSchema.parse(track)] }) || !isCurrent()) return false;
  return await send({ op: "play", id: track.id }) && isCurrent();
}
