import { useAlbumDrag } from "./use-album-drag";
import { Icons } from "../icons/icons";
import { cn } from "../lib/utils";
import "./album-button.css";
import "./audio-controls.css";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "../button/button";
import { NativeInput } from "../input/input";
export function audioTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function AudioControls({ title, playing, buffering, position, duration, onPlay, onPause, onSeek, labels, artist, artwork, previous, next }: {
  artist?: string; artwork?: ReactNode; previous?: { label: string; onClick: () => void; disabled?: boolean }; next?: { label: string; onClick: () => void; disabled?: boolean };
  title: string; playing: boolean; buffering: boolean; position: number; duration: number;
  onPlay: () => void; onPause: () => void; onSeek: (position: number) => void;
  labels: { play: string; pause: string; seek: string; buffering: string };
}) {
  const [seeking, setSeeking] = useState<number | null>(null);
  const commit = () => { if (seeking !== null) { onSeek(seeking); setSeeking(null); } };
  return <section className="audio-controls" aria-label={title}>
    <div className="audio-controls-heading">{artwork}<div><strong>{title}</strong>{artist && <p>{artist}</p>}</div></div>
    <div className="audio-controls-progress">
      <NativeInput type="range" aria-label={labels.seek} min={0} max={duration || 1} step={0.1}
        disabled={duration <= 0} value={seeking ?? Math.min(position, duration || 0)}
        onChange={event => setSeeking(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit}
        onBlur={commit} onPointerCancel={() => setSeeking(null)} />
      <div className="audio-controls-time"><span>{audioTime(seeking ?? position)}</span><span>{buffering ? labels.buffering : audioTime(duration)}</span></div>
    </div>
    <div className="audio-controls-transport">
      {previous && <Button variant="ghost" size="icon" aria-label={previous.label} title={previous.label} disabled={previous.disabled} onClick={previous.onClick}><Icons.skipBack aria-hidden="true" /></Button>}
      <Button className="audio-controls-play" type="button" size="icon" aria-label={playing ? labels.pause : labels.play} title={playing ? labels.pause : labels.play} onClick={playing ? onPause : onPlay}>{playing ? <Icons.pause aria-hidden="true" /> : <Icons.play aria-hidden="true" />}</Button>
      {next && <Button variant="ghost" size="icon" aria-label={next.label} title={next.label} disabled={next.disabled} onClick={next.onClick}><Icons.skipForward aria-hidden="true" /></Button>}
    </div>
  </section>;

}
export function LyricsView({ cues, active, onSeek, emptyLabel, followLabel }: {
  cues: { start: number; text: string }[]; active: number; onSeek: (seconds: number) => void;
  emptyLabel: string; followLabel: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => {
    if (follow && active >= 0) {
      const line = root.current?.querySelector<HTMLElement>(`[data-cue="${active}"]`);
      if (line && root.current) root.current.scrollTop = Math.max(0, line.offsetTop - root.current.clientHeight / 2 + line.clientHeight / 2);
    }
  }, [active, follow]);
  if (!cues.length) return <p className="audio-lyrics-empty">{emptyLabel}</p>;
  return <section className="grid gap-2">
    {!follow && <Button variant="ghost" onClick={() => setFollow(true)}>{followLabel}</Button>}
    <div ref={root} className="relative max-h-64 overflow-y-auto" onWheel={() => setFollow(false)} onTouchStart={() => setFollow(false)}>
      {cues.map((cue, index) => <Button key={`${index}:${cue.start}`} data-cue={index} variant="ghost"
        className={`min-h-11 w-full justify-start whitespace-pre-wrap text-left ${index === active ? "text-foreground" : "text-muted-foreground"}`}
        aria-current={index === active ? "true" : undefined} onClick={() => onSeek(cue.start)}>{cue.text || "♪"}</Button>)}
    </div>
  </section>;
}

export function AlbumButton({ artwork, status, label, description, onClick, hidden, className, draggable = false }: {
  artwork?: string; status: "idle" | "playing" | "paused" | "buffering" | "error";
  label: string; description: string; onClick: () => void; hidden?: boolean; className?: string; draggable?: boolean;
}) {
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const descriptionId = useId();
  const drag = useAlbumDrag(draggable);
  const StatusIcon = status === "error" ? Icons.alertCircle : status === "paused" ? Icons.pause : status === "playing" ? Icons.audioLines : Icons.headphones;
  return <Button unstyled {...drag} data-draggable={draggable || undefined} className={cn("album-button", className)} hidden={hidden} onClick={onClick}
    aria-label={label} aria-describedby={descriptionId} aria-haspopup="dialog" data-state={status} title={description}>
    <span className="album-button-disc" aria-hidden="true">
      {artwork && failedArtwork !== artwork ? <img src={artwork} width={64} height={64} alt="" draggable={false} onError={() => setFailedArtwork(artwork)} /> :
        <span className="album-button-fallback"><Icons.music /></span>}
    </span>
    <span className="album-button-status" aria-hidden="true">{status === "buffering" ? <span className="album-button-spinner" /> : <StatusIcon />}</span>
    <span id={descriptionId} className="sr-only">{description}</span>
  </Button>;
}

export function AudioArtwork({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={cn("audio-artwork", className)} aria-hidden="true">
    {src && failed !== src ? <img src={src} width={96} height={96} alt="" draggable={false} onError={() => setFailed(src)} /> : <Icons.music />}
  </span>;
}
