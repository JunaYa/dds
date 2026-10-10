import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { nightStatus, type NightMetric } from "./night-status";

const labels = {
  neutral: "No reliable estimate",
  green: "Before the usual time",
  yellow: "Approaching the usual time",
  red: "At or beyond the usual time",
};

export function NightStatus({ child, now, enabled }: { child: string; now: Date; enabled: boolean }) {
  const a = useApp();
  const { tr } = useI18n();
  const status = nightStatus(a.records, a.session, child, now);
  const duration = (minutes: number) => tr("{hours}h {minutes}m", { hours: Math.floor(minutes / 60), minutes: Math.floor(minutes % 60) });
  function details(metric: NightMetric) {
    return <>
      <p className="night-signal-label" data-signal={metric.signal}><span aria-hidden="true" />{tr(labels[metric.signal])}</p>
      <p>{metric.typical === null ? tr("Not enough consistent records for an estimate.") : tr("7-day median · {count} samples · {duration}", { count: metric.samples, duration: duration(metric.typical) })}</p>
      {metric.typical !== null && !metric.paused && metric.elapsed !== null && <p>{metric.elapsed < metric.typical
        ? tr("About {duration} until the historical reference", { duration: duration(metric.typical - metric.elapsed) })
        : tr("Past the historical reference by {duration}", { duration: duration(metric.elapsed - metric.typical) })}</p>}
    </>;
  }
  return <>
    {enabled && <div className="night-edge-glow" data-signal={status.signal} aria-hidden="true" />}
    <section className="night-status" aria-label={tr("Care timing")}>
      <div className="night-status-metrics">
        <article>
          <h3>{tr("Sleep timer")}{status.sleep.paused && ` · ${tr("Paused")}`}</h3>
          <strong>{status.sleep.elapsed === null ? tr("No active sleep timer") : duration(status.sleep.elapsed)}</strong>
          {details(status.sleep)}
        </article>
        <article>
          <h3>{tr("Since last recorded feeding")}{status.feed.paused && ` · ${tr("Feeding timer active")}`}</h3>
          <strong>{status.feed.elapsed === null ? tr("No recent feeding record") : duration(status.feed.elapsed)}</strong>
          {details(status.feed)}
        </article>
      </div>
      <p className="night-status-note">{tr("History is a reference, not a wake-up prediction or feeding schedule. Follow your baby's cues and care plan; green does not mean delay feeding.")}</p>
      <p className="night-status-note">{tr("Green: below 80% · Yellow: 80–100% · Red: at or above the median. Day and night records are compared separately (19:00–07:00).")}</p>
    </section>
  </>;
}
