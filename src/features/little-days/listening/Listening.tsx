import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@vita/ui/button";
import { Input, NativeInput } from "@vita/ui/input";
import { Textarea } from "@vita/ui/textarea";
import { NativeSelect } from "@vita/ui/select";
import { Dialog, DialogPopup, DialogHeader, DialogTitle, DialogDescription } from "@vita/ui/dialog";
import { AudioControls, LyricsView } from "@vita/ui/audio-player";
import { useAudio } from "~/audio/AudioProvider";
import { catalogSchema, trackSchema, type Track } from "~/audio/model";
import { nativeAudio } from "~/audio/backend";
import { activeCue, parseLyrics } from "~/audio/lyrics";
import { useI18n } from "../i18n/useI18n";
import "./listening.css";

type Category = Track["category"];
export function openListening(category: Category) { window.dispatchEvent(new CustomEvent("little-days-listening", { detail: category })); }
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
export function MiniAudioPlayer() {
  const { state, send } = useAudio();
  const { tr } = useI18n();
  const track = state.tracks.find(item => item.id === state.trackId);
  if (!track) return null;
  return <aside className="audio-mini" aria-label={tr("Now playing")}>
    <Button variant="ghost" className="min-w-0 flex-1 justify-start truncate" onClick={() => openListening(track.category)}>{track.title}</Button>
    <Button variant="secondary" onClick={() => void send({ op: state.playing ? "pause" : "play" })}>{tr(state.playing ? "Pause" : "Play")}</Button>
  </aside>;
}
export function ListeningHub() {
  const { tr } = useI18n();
  const { state, send } = useAudio();
  const [category, setCategory] = useState<Category>("sleep");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const track = state.tracks.find(item => item.id === state.trackId);
  const cues = useMemo(() => parseLyrics(track?.lyrics ?? ""), [track?.lyrics]);
  useEffect(() => {
    const show = (event: Event) => {
      if (!(event instanceof CustomEvent) || !["sleep", "songs"].includes(event.detail)) return;
      setCategory(event.detail); setOpen(true);
    };
    window.addEventListener("little-days-listening", show);
    return () => window.removeEventListener("little-days-listening", show);
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
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogPopup className="care-dialog audio-dialog" bottomStickOnMobile={false}>
      <DialogHeader><DialogTitle>{tr(category === "sleep" ? "Sleep sounds" : "Nursery rhymes")}</DialogTitle>
        <DialogDescription>{tr("One player, across your app, lock screen and widgets.")}</DialogDescription></DialogHeader>
      <div className="audio-content">
        {!nativeAudio() && <p className="text-sm text-muted-foreground">{tr("Background playback depends on this browser. Use the mobile app for native widgets and background timers.")}</p>}
        {state.systemControls === false && <p role="status">{tr("System media controls are unavailable on this device.")}</p>}
        {(localError || state.error) && <p role="alert" className="text-destructive">{localError ?? tr(state.error ?? "")}</p>}
        {track && <section className="audio-now">
          <h3>{tr("Now playing")}</h3>
          <AudioControls key={track.id} title={track.title} playing={state.playing} buffering={state.buffering} position={state.position} duration={state.duration}
            onPlay={() => void send({ op: "play" })} onPause={() => void send({ op: "pause" })} onSeek={position => void send({ op: "seek", position })}
            labels={{ play: tr("Play"), pause: tr("Pause"), seek: tr("Playback position"), buffering: tr("Buffering…") }} />
          <div className="audio-options">
            <Button variant="outline" aria-pressed={state.repeat} onClick={() => void send({ op: "repeat", enabled: !state.repeat })}>{tr(state.repeat ? "Repeat on" : "Repeat off")}</Button>
            <label>{tr("Sleep timer")}<NativeSelect aria-label={tr("Sleep timer")} value={state.deadline ? "active" : "0"} onChange={event => void send({ op: "timer", minutes: Number(event.target.value) })}>
              <option value="0">{tr("Off")}</option>{state.deadline && <option value="active" disabled>{tr("Stops at {time}", { time: new Date(state.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}</option>}
              {[15, 30, 60].map(minutes => <option key={minutes} value={minutes}>{tr("{minutes} minutes", { minutes })}</option>)}
            </NativeSelect></label>
            <Button variant="ghost" onClick={() => void send({ op: "stop" })}>{tr("Stop")}</Button>
          </div>
          <LyricsView key={track.id} cues={cues} active={activeCue(cues, state.position)} onSeek={position => void send({ op: "seek", position })}
            emptyLabel={tr("No lyrics for this track.")} followLabel={tr("Follow lyrics")} />
        </section>}
        <section className="audio-library" aria-label={tr("Audio library")}>
          <h3>{tr("Audio library")}</h3>
          {state.tracks.filter(item => item.category === category).map(item => <article key={item.id} className="audio-track">
            <div className="min-w-0"><strong>{item.title}</strong><p>{item.artist}</p><small className="text-muted-foreground">{item.license}</small>
              {item.sourcePage && <a href={item.sourcePage} target="_blank" rel="noreferrer">{tr("Source and license")}</a>}</div>
            <div className="audio-options">
              <Button variant="secondary" onClick={() => void send({ op: "play", id: item.id })}>{tr("Play")}</Button>
              <Button variant="outline" disabled={busy === item.id || state.downloading.includes(item.id)} onClick={async () => {
                setBusy(item.id); await send({ op: state.downloaded.includes(item.id) ? "removeDownload" : "download", id: item.id }); setBusy(null);
              }}>{tr(state.downloading.includes(item.id) || busy === item.id ? "Downloading…" : state.downloaded.includes(item.id) ? "Remove download" : "Download")}</Button>
            </div>
          </article>)}
          {!state.tracks.some(item => item.category === category) && <div className="audio-empty"><h3>{tr("Your listening library starts here.")}</h3><p>{tr("Add licensed audio or import a curated catalog to listen and download offline.")}</p></div>}
        </section>
        <div className="audio-options"><Button variant="outline" onClick={() => setAdding(!adding)}>{tr(adding ? "Cancel" : "Add audio")}</Button>
          <label className="grid gap-1">{tr("Import catalog (JSON)")}<NativeInput type="file" accept="application/json,.json" onChange={event => { void importCatalog(event.target.files?.[0]); event.target.value = ""; }} /></label>
        </div>
        {adding && <form onSubmit={event => void add(event)} className="audio-form">
          <label>{tr("Title")}<Input name="title" required maxLength={200} /></label>
          <label>{tr("Artist")}<Input name="artist" maxLength={200} /></label>
          <label>{tr("Audio file URL (HTTPS)")}<Input name="url" type="url" required placeholder="https://" /></label>
          <label>{tr("Source page (optional)")}<Input name="sourcePage" type="url" placeholder="https://pixabay.com/…" /></label>
          <label>{tr("License or permission reference")}<Input name="license" required maxLength={500} /></label>
          <p className="text-sm text-muted-foreground">{tr("Use files you have permission to distribute and cache. Pixabay search pages are not audio file URLs.")}</p>
          <label>{tr("Lyrics (LRC or WebVTT)")}<Textarea name="lyrics" rows={5} maxLength={500000} /></label>
          <Button type="submit" loading={saving}>{tr("Add audio")}</Button>
        </form>}
      </div>
    </DialogPopup>
  </Dialog>;
}
