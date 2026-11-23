import { useEffect, useRef, useState } from "react";
import { AudioArtwork } from "@vita/ui/audio-player";
import { Icons } from "@vita/ui/icons";
import { Button } from "@vita/ui/button";
import { useAudio } from "~/audio/AudioProvider";
import { bundledAudio, loadAudioCatalog, type AudioCatalog, type AudioResource } from "~/audio/catalog";
import { trackSchema, type Track } from "~/audio/model";
import { playTrack } from "~/audio/play-track";
import { useI18n } from "../i18n/useI18n";

export function AudioResources({ category, onPlayed }: { category?: Track["category"]; onPlayed?: () => void }) {
  const { tr } = useI18n();
  const { state, send } = useAudio();
  const [catalog, setCatalog] = useState<AudioCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<Record<string, "play" | "download">>({});
  const [actionError, setActionError] = useState(false);
  const playIntent = useRef(0);
  useEffect(() => () => { playIntent.current++; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    void loadAudioCatalog(controller.signal).then(value => {
      if (!controller.signal.aborted) setCatalog(value);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [attempt]);

  async function useResource(item: AudioResource, action: "play" | "download") {
    const intent = action === "play" ? ++playIntent.current : null;
    setActionError(false);
    setPending(previous => ({ ...previous, [item.id]: action }));
    try {
      if (action === "play") {
        if (await playTrack(item, state.downloaded, send, () => intent === playIntent.current)) onPlayed?.();
      } else {
        if (!await send({ op: "catalog", tracks: [trackSchema.parse(item)] })) return;
        if (!state.downloaded.includes(item.id)) {
          const data = await bundledAudio(item);
          await send({ op: "cache", id: item.id, data, sha256: item.sha256 });
        }
      }
    } catch {
      setActionError(true);
    } finally {
      setPending(previous => { const next = { ...previous }; delete next[item.id]; return next; });
    }
  }

  return <section className="audio-library" aria-label={tr(category ? "Included audio" : "Playlist")}>
    <h3>{tr(category ? "Included audio" : "Playlist")}</h3>
    {actionError && <p role="alert">{tr("Could not prepare this audio. Try again.")}</p>}
    {failed ? <div role="alert">
      <p>{tr("Could not load the resource catalog.")}</p>
      <Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{tr("Try again")}</Button>
    </div> : !catalog ? <p role="status">{tr("Loading resources…")}</p> : catalog.resources.filter(item => !category || item.category === category).map(item => {
      const working = !!pending[item.id];
      const downloading = state.downloading.includes(item.id);
      const downloaded = state.downloaded.includes(item.id);
      return <article className="audio-track" key={item.id} aria-current={state.trackId === item.id ? "true" : undefined}>
        <AudioArtwork src={item.artwork?.startsWith("audio/") ? `${import.meta.env.BASE_URL}${item.artwork}` : item.artwork} />
        <div className="audio-track-copy"><strong>{item.title}</strong><p>{item.artist} · {tr(item.category === "sleep" ? "Sleep sounds" : "Nursery rhymes")}</p>
          <small className="text-muted-foreground">{tr(item.type)} · {Math.floor(item.durationSeconds / 60)}:{String(Math.floor(item.durationSeconds % 60)).padStart(2, "0")} · {item.license}</small>
        </div>
        <div className="audio-track-actions">
          <Button variant="ghost" size="icon" aria-label={tr("Play")} title={tr("Play")} loading={pending[item.id] === "play"} disabled={working} onClick={() => void useResource(item, "play")}><Icons.play aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" aria-label={tr(downloaded ? "Downloaded" : downloading ? "Downloading…" : "Download")} title={tr(downloaded ? "Downloaded" : "Download")} disabled={working || downloading || downloaded} onClick={() => void useResource(item, "download")}>{downloaded ? <Icons.check aria-hidden="true" /> : <Icons.download aria-hidden="true" />}</Button>
        </div>
      </article>;
    })}
    {catalog && state.tracks.filter(item => (!category || item.category === category) && !catalog.resources.some(resource => resource.id === item.id)).map(item =>
      <article className="audio-track" key={item.id} aria-current={state.trackId === item.id ? "true" : undefined}>
        <AudioArtwork src={item.artwork?.startsWith("audio/") ? `${import.meta.env.BASE_URL}${item.artwork}` : item.artwork} />
        <div className="audio-track-copy"><strong>{item.title}</strong><p>{item.artist} · {tr(item.category === "sleep" ? "Sleep sounds" : "Nursery rhymes")}</p></div>
        <div className="audio-track-actions">
          <Button variant="ghost" size="icon" aria-label={tr("Play")} title={tr("Play")} onClick={async () => { if (await send({ op: "play", id: item.id })) onPlayed?.(); }}><Icons.play aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" aria-label={tr(state.downloaded.includes(item.id) ? "Remove download" : "Download")} title={tr(state.downloaded.includes(item.id) ? "Remove download" : "Download")} disabled={state.downloading.includes(item.id)} onClick={() => void send({ op: state.downloaded.includes(item.id) ? "removeDownload" : "download", id: item.id })}>{state.downloaded.includes(item.id) ? <Icons.check aria-hidden="true" /> : <Icons.download aria-hidden="true" />}</Button>
        </div>
      </article>)}
  </section>;
}
