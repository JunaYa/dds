import { openListening, openPlayer } from "./listening-events";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { loadAudioCatalog, type AudioResource } from "~/audio/catalog";
import { playTrack } from "~/audio/play-track";
import { Icons } from "@vita/ui/icons";
import { Button } from "@vita/ui/button";
import { Input, NativeInput } from "@vita/ui/input";
import { Textarea } from "@vita/ui/textarea";
import { NativeSelect } from "@vita/ui/select";
import { Dialog, DialogPopup, DialogHeader, DialogTitle, DialogClose } from "@vita/ui/dialog";
import { AlbumButton, AudioArtwork, AudioControls, LyricsView } from "@vita/ui/audio-player";
import { useAudio } from "~/audio/AudioProvider";
import { catalogSchema, trackSchema, type Track } from "~/audio/model";
import { nativeAudio } from "~/audio/backend";
import { activeCue, parseLyrics } from "~/audio/lyrics";
import { useI18n } from "../i18n/useI18n";
import "./listening.css";
import { AudioResources } from "./AudioResources";

type Category = Track["category"];
export function ListeningLauncher() {
  const { tr } = useI18n();
  return <section className="profile-group" aria-label={tr("Listening")}>
    <h2>{tr("Listening")}</h2>
    <div className="profile-links">
      <Button unstyled className="profile-link" onClick={() => openListening("sleep")}><span><strong>{tr("Sleep sounds")}</strong><small>{tr("A quiet loop and a sleep timer.")}</small></span><span aria-hidden="true">›</span></Button>
      <Button unstyled className="profile-link" onClick={() => openListening("songs")}><span><strong>{tr("Nursery rhymes")}</strong><small>{tr("Songs, lyrics and offline listening.")}</small></span><span aria-hidden="true">›</span></Button>
    </div>
  </section>;
}
export function ListeningHub() {
  const { tr } = useI18n();
  const { state, send } = useAudio();
  const [category, setCategory] = useState<Category>("sleep");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"library" | "player">("player");
  const [includedTracks, setIncludedTracks] = useState<AudioResource[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(null);
    void loadAudioCatalog(controller.signal).then(catalog => {
      if (!controller.signal.aborted) setIncludedTracks(catalog.resources);
    }).catch(() => {
      if (!controller.signal.aborted) setCatalogError("Could not load the resource catalog.");
    });
    return () => controller.abort();
  }, [open]);
  const [adding, setAdding] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const switchingRef = useRef(false);
  const playlist = [...includedTracks, ...state.tracks.filter(item => !includedTracks.some(resource => resource.id === item.id))];
  async function changeTrack(direction: number) {
    if (switchingRef.current || playlist.length < 2) return;
    const index = playlist.findIndex(item => item.id === state.trackId);
    const next = playlist[(index + direction + playlist.length) % playlist.length];
    switchingRef.current = true; setSwitching(true);
    try { await playTrack(next, state.downloaded, send); }
    catch { setLocalError(tr("Could not prepare this audio. Try again.")); }
    finally { switchingRef.current = false; setSwitching(false); }
  }
  const track = state.tracks.find(item => item.id === state.trackId);
  const artwork = track?.artwork ?? includedTracks.find(item => item.id === track?.id)?.artwork;
  const cues = useMemo(() => parseLyrics(track?.lyrics ?? ""), [track?.lyrics]);
  useEffect(() => {
    const show = (event: Event) => {
      if (!(event instanceof CustomEvent) || !["sleep", "songs"].includes(event.detail)) return;
      setCategory(event.detail); setView("library"); setOpen(true);
    };
    const showPlayer = () => { setView("player"); setOpen(true); };
    window.addEventListener("little-days-listening", show);
    window.addEventListener("little-days-player", showPlayer);
    return () => {
      window.removeEventListener("little-days-listening", show);
      window.removeEventListener("little-days-player", showPlayer);
    };
  }, []);
  async function importCatalog(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error(tr("Catalog must be smaller than 2 MB."));
      await send({ op: "catalog", tracks: catalogSchema.parse(JSON.parse(await file.text())) });
      setLocalError(null);
    } catch (error) { setLocalError(String(error)); }
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const item = trackSchema.parse({ id: crypto.randomUUID(), title: data.get("title"), artist: data.get("artist"),
        category, url: data.get("url"), sourcePage: data.get("sourcePage") || undefined, license: data.get("license"), lyrics: data.get("lyrics") });
      if (!await send({ op: "catalog", tracks: [item] })) return;
      setAdding(false); setLocalError(null);
    } catch { setLocalError(tr("Check the audio details and use HTTPS addresses.")); }
    finally { setSaving(false); }
  }
  return <>
    <div className="audio-floating-area">
    <AlbumButton draggable className="audio-floating-entry" hidden={open} onClick={openPlayer}
      label={tr("Open player")}
      artwork={artwork?.startsWith("audio/") ? `${import.meta.env.BASE_URL}${artwork}` : artwork}
      status={state.error ? "error" : state.buffering ? "buffering" : !track ? "idle" : state.playing ? "playing" : "paused"}
      description={`${track?.title ?? tr("Player")} · ${tr(state.error ? "Playback error" : state.buffering ? "Buffering…" : !track ? "Choose something to play." : state.playing ? "Playing" : "Paused")}`} />
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
    <DialogPopup className="care-dialog audio-dialog" viewportProps={{ className: "audio-dialog-viewport" }} showCloseButton={false} bottomStickOnMobile={false} closeLabel={tr("Close dialog")}>
      <DialogHeader className="audio-dialog-heading"><DialogTitle>{tr(view === "player" ? "Player" : category === "sleep" ? "Sleep sounds" : "Nursery rhymes")}</DialogTitle>
        <DialogClose aria-label={tr("Close dialog")} render={<Button variant="ghost" size="icon" />}><Icons.chevronDown aria-hidden="true" /></DialogClose>
      </DialogHeader>
      <div className="audio-content">
        {!nativeAudio() && <p className="text-sm text-muted-foreground">{tr("Background playback depends on this browser. Use the mobile app for native widgets and background timers.")}</p>}
        {state.systemControls === false && <p role="status">{tr("System media controls are unavailable on this device.")}</p>}
        {(localError || state.error || catalogError) && <p role="alert" className="text-destructive">{localError ?? tr(state.error ?? catalogError ?? "")}</p>}
        {view === "player" && <>
        {track ? <section className="audio-now">
          <AudioControls key={`controls:${track.id}`} title={track.title} artist={track.artist}
            artwork={<AudioArtwork src={artwork?.startsWith("audio/") ? `${import.meta.env.BASE_URL}${artwork}` : artwork} />}
            previous={{ label: tr("Previous track"), disabled: switching || playlist.length < 2, onClick: () => void changeTrack(-1) }}
            next={{ label: tr("Next track"), disabled: switching || playlist.length < 2, onClick: () => void changeTrack(1) }} playing={state.playing} buffering={state.buffering} position={state.position} duration={state.duration}
            onPlay={() => void send({ op: "play" })} onPause={() => void send({ op: "pause" })} onSeek={position => void send({ op: "seek", position })}
            labels={{ play: tr("Play"), pause: tr("Pause"), seek: tr("Playback position"), buffering: tr("Buffering…") }} />
          <div className="audio-options audio-transport">
            <Button variant="outline" size="icon" aria-label={tr(state.repeat ? "Repeat on" : "Repeat off")} title={tr(state.repeat ? "Repeat on" : "Repeat off")} aria-pressed={state.repeat} onClick={() => void send({ op: "repeat", enabled: !state.repeat })}><Icons.repeat aria-hidden="true" /></Button>
            <label className="audio-timer" data-active={state.deadline ? "true" : undefined}>
              <Icons.clock aria-hidden="true" />
              <NativeSelect aria-label={tr("Sleep timer")} title={tr("Sleep timer")} value={state.deadline ? "active" : "0"} onChange={event => void send({ op: "timer", minutes: Number(event.target.value) })}>
                <option value="0">{tr("Off")}</option>{state.deadline && <option value="active" disabled>{tr("Stops at {time}", { time: new Date(state.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}</option>}
                {[15, 30, 60].map(minutes => <option key={minutes} value={minutes}>{tr("{minutes} minutes", { minutes })}</option>)}
              </NativeSelect>
              {state.deadline && <span className="audio-timer-indicator" aria-hidden="true" />}
            </label>
            <Button variant="ghost" size="icon" aria-label={tr("Stop")} title={tr("Stop")} onClick={() => void send({ op: "stop" })}><Icons.square aria-hidden="true" /></Button>
          </div>
          <LyricsView key={`lyrics:${track.id}`} cues={cues} active={activeCue(cues, state.position)} onSeek={position => void send({ op: "seek", position })}
            emptyLabel={tr("No lyrics for this track.")} followLabel={tr("Follow lyrics")} />
        </section> : <div className="audio-empty"><h3>{tr("Choose something to play.")}</h3><p>{tr("Browse sleep sounds or nursery rhymes to start listening.")}</p></div>}
        {open && <AudioResources onPlayed={() => setView("player")} />}
        </>}
        {view === "library" && <>
        {open && <AudioResources category={category} onPlayed={() => setView("player")} />}
        <div className="audio-options"><Button variant="outline" onClick={() => setAdding(!adding)}>{tr(adding ? "Cancel" : "Add audio")}</Button>
          <label className="grid gap-1">{tr("Import catalog (JSON)")}<NativeInput type="file" accept="application/json,.json" onChange={event => { void importCatalog(event.target.files?.[0]); event.target.value = ""; }} /></label>
        </div>
        {adding && <form onSubmit={event => void add(event)} className="audio-form">
          <label>{tr("Title")}<Input name="title" required maxLength={200} /></label>
          <label>{tr("Artist")}<Input name="artist" maxLength={200} /></label>
          <label>{tr("Audio file URL (HTTPS)")}<Input name="url" type="url" required placeholder="https://" /></label>
          <label>{tr("Source page (optional)")}<Input name="sourcePage" type="url" placeholder="https://…" /></label>
          <label>{tr("License or permission reference")}<Input name="license" required maxLength={500} /></label>
          <p className="text-sm text-muted-foreground">{tr("Use licensed audio file addresses, not web page addresses.")}</p>
          <label>{tr("Lyrics (LRC or WebVTT)")}<Textarea name="lyrics" rows={5} maxLength={500000} /></label>
          <Button type="submit" loading={saving}>{tr("Add audio")}</Button>
        </form>}
        </>}
      </div>
    </DialogPopup>
  </Dialog>
  </>;
}
