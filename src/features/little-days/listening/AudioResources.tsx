import { useEffect, useRef, useState } from "react";
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
    <p className="text-sm text-muted-foreground">{tr("Play here or download for offline listening. These recordings are CC0 or public domain.")}</p>
    {actionError && <p role="alert">{tr("Could not prepare this audio. Try again.")}</p>}
    {failed ? <div role="alert">
      <p>{tr("Could not load the resource catalog.")}</p>
      <Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{tr("Try again")}</Button>
    </div> : !catalog ? <p role="status">{tr("Loading resources…")}</p> : catalog.resources.filter(item => !category || item.category === category).map(item => {
      const working = !!pending[item.id];
      const downloading = state.downloading.includes(item.id);
      const downloaded = state.downloaded.includes(item.id);
      return <article className="audio-track" key={item.id} aria-current={state.trackId === item.id ? "true" : undefined}>
        <div><strong>{item.title}</strong><p>{item.artist} · {tr(item.category === "sleep" ? "Sleep sounds" : "Nursery rhymes")}</p>
          <small className="text-muted-foreground">{tr(item.type)} · {Math.floor(item.durationSeconds / 60)}:{String(Math.floor(item.durationSeconds % 60)).padStart(2, "0")} · {item.license}</small>
        </div>
        <div className="audio-options">
          <Button variant="secondary" loading={pending[item.id] === "play"} disabled={working} onClick={() => void useResource(item, "play")}>{tr("Play")}</Button>
          <Button variant="outline" disabled={working || downloading || downloaded} onClick={() => void useResource(item, "download")}>{tr(downloaded ? "Downloaded" : pending[item.id] === "download" || downloading ? "Downloading…" : "Download")}</Button>
        </div>
      </article>;
    })}
    {catalog && state.tracks.filter(item => (!category || item.category === category) && !catalog.resources.some(resource => resource.id === item.id)).map(item =>
      <article className="audio-track" key={item.id} aria-current={state.trackId === item.id ? "true" : undefined}>
        <div><strong>{item.title}</strong><p>{item.artist} · {tr(item.category === "sleep" ? "Sleep sounds" : "Nursery rhymes")}</p></div>
        <div className="audio-options">
          <Button variant="secondary" onClick={async () => { if (await send({ op: "play", id: item.id })) onPlayed?.(); }}>{tr("Play")}</Button>
          <Button variant="outline" disabled={state.downloading.includes(item.id)} onClick={() => void send({ op: state.downloaded.includes(item.id) ? "removeDownload" : "download", id: item.id })}>{tr(state.downloaded.includes(item.id) ? "Remove download" : "Download")}</Button>
        </div>
      </article>)}
  </section>;
}
