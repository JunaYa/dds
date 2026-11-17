import { useEffect, useState } from "react";
import { Button } from "@vita/ui/button";
import { loadPixabayCatalog, type PixabayCatalog } from "~/audio/pixabay-catalog";
import type { Track } from "~/audio/model";
import { useI18n } from "../i18n/useI18n";

export function PixabayResources({ category }: { category: Track["category"] }) {
  const { tr } = useI18n();
  const [catalog, setCatalog] = useState<PixabayCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    void loadPixabayCatalog(controller.signal).then(value => {
      if (!controller.signal.aborted) setCatalog(value);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [attempt]);
  return <section className="audio-library" aria-label={tr("Discover on Pixabay")}>
    <h3>{tr("Discover on Pixabay")}</h3>
    <p className="text-sm text-muted-foreground">{tr("Explore these tracks on Pixabay. In-app playback requires a separately licensed audio file.")}</p>
    {failed ? <div role="alert">
      <p>{tr("Could not load the resource catalog.")}</p>
      <Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{tr("Try again")}</Button>
    </div> : !catalog ? <p role="status">{tr("Loading resources…")}</p> : catalog.resources.filter(item => item.category === category).map(item =>
      <article className="audio-track" key={item.id}>
        <div><strong>{item.title}</strong><p>{item.artist}</p>
          <small className="text-muted-foreground">{tr(item.type)} · {Math.floor(item.durationSeconds / 60)}:{String(item.durationSeconds % 60).padStart(2, "0")}{item.aiGenerated === true ? ` · ${tr("AI-generated")}` : ""}</small>
        </div>
        <a href={item.sourcePage} target="_blank" rel="noreferrer">{tr("View on Pixabay")} ↗</a>
      </article>)}
  </section>;
}
