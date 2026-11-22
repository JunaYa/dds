import { bundledAudio, type AudioResource } from "./catalog";
import { trackSchema, type AudioCommand, type Track } from "./model";

export async function playTrack(track: Track | AudioResource, downloaded: string[], send: (command: AudioCommand) => Promise<boolean>, isCurrent = () => true) {
  if (!await send({ op: "catalog", tracks: [trackSchema.parse(track)] }) || !isCurrent()) return false;
  if ("assetPath" in track && !downloaded.includes(track.id)) {
    const data = await bundledAudio(track);
    if (!isCurrent() || !await send({ op: "cache", id: track.id, data, sha256: track.sha256 })) return false;
  }
  return isCurrent() && await send({ op: "play", id: track.id }) && isCurrent();
}
