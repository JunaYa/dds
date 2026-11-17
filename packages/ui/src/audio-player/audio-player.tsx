import { useEffect, useRef, useState } from "react";
import { Button } from "../button/button";
import { NativeInput } from "../input/input";
export function audioTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function AudioControls({ title, playing, buffering, position, duration, onPlay, onPause, onSeek, labels }: {
  title: string; playing: boolean; buffering: boolean; position: number; duration: number;
  onPlay: () => void; onPause: () => void; onSeek: (position: number) => void;
  labels: { play: string; pause: string; seek: string; buffering: string };
}) {
  const [seeking, setSeeking] = useState<number | null>(null);
  const commit = () => { if (seeking !== null) { onSeek(seeking); setSeeking(null); } };
  return <section className="grid gap-3" aria-label={title}>
    <div className="flex items-center justify-between gap-3">
      <strong className="min-w-0 truncate">{title}</strong>
      <Button type="button" variant="secondary" onClick={playing ? onPause : onPlay}>{playing ? labels.pause : labels.play}</Button>
    </div>
    <NativeInput type="range" aria-label={labels.seek} min={0} max={duration || 1} step={0.1}
      disabled={duration <= 0} value={seeking ?? Math.min(position, duration || 0)}
      onChange={event => setSeeking(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit}
      onBlur={commit} onPointerCancel={() => setSeeking(null)} className="h-11 w-full" />
    <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
      <span>{audioTime(seeking ?? position)}</span><span>{buffering ? labels.buffering : audioTime(duration)}</span>
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
  if (!cues.length) return <p className="min-h-32 text-muted-foreground">{emptyLabel}</p>;
  return <section className="grid gap-2">
    {!follow && <Button variant="ghost" onClick={() => setFollow(true)}>{followLabel}</Button>}
    <div ref={root} className="relative max-h-64 overflow-y-auto" onWheel={() => setFollow(false)} onTouchStart={() => setFollow(false)}>
      {cues.map((cue, index) => <Button key={`${index}:${cue.start}`} data-cue={index} variant="ghost"
        className={`min-h-11 w-full justify-start whitespace-pre-wrap text-left ${index === active ? "text-foreground" : "text-muted-foreground"}`}
        aria-current={index === active ? "true" : undefined} onClick={() => onSeek(cue.start)}>{cue.text || "♪"}</Button>)}
    </div>
  </section>;
}
