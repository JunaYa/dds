import { useI18n } from "../i18n/useI18n";
import type { NightMetric } from "./night-status";

const labels = {
  neutral: "No reliable estimate",
  green: "Before the usual time",
  yellow: "Approaching the usual time",
  red: "At or beyond the usual time",
};

export function NightStatusMetric({ metric, kind, detailed, inline = false }: { inline?: boolean; metric: NightMetric; kind: 'sleep' | 'feed'; detailed: boolean }) {
  const { tr } = useI18n();
  const duration = (minutes: number) => tr("{hours}h {minutes}m", { hours: Math.floor(minutes / 60), minutes: Math.floor(minutes % 60) });
  const Root = inline ? 'span' : 'div';
  const Heading = inline ? 'span' : 'h3';
  const Paragraph = inline ? 'span' : 'p';
  return <Root className="night-status">
    <Heading className="night-status-heading">{tr(kind === 'sleep' ? "Sleep timer" : "Since last recorded feeding")}</Heading>
    <strong className={metric.elapsed === null ? undefined : 'night-status-duration'}>{metric.elapsed === null ? tr(kind === 'sleep' ? "No active sleep timer" : "No recent feeding record") : duration(metric.elapsed)}</strong>
    {metric.paused && <Paragraph>{tr(kind === 'sleep' ? "Paused" : "Feeding timer active")}</Paragraph>}
    <Paragraph className="night-signal-label" data-signal={metric.signal}><span aria-hidden="true" />{tr(labels[metric.signal])}</Paragraph>
    {detailed && <>
      <Paragraph>{metric.typical === null ? tr("Not enough consistent records for an estimate.") : tr("7-day median · {count} samples · {duration}", { count: metric.samples, duration: duration(metric.typical) })}</Paragraph>
      {metric.typical !== null && !metric.paused && metric.elapsed !== null && <Paragraph>{metric.elapsed < metric.typical
        ? tr("About {duration} until the historical reference", { duration: duration(metric.typical - metric.elapsed) })
        : tr("Past the historical reference by {duration}", { duration: duration(metric.elapsed - metric.typical) })}</Paragraph>}
    </>}
  </Root>;
}

export function NightStatusNotes() {
  const { tr } = useI18n();
  return <div className="night-status-notes">
    <p>{tr("History is a reference, not a wake-up prediction or feeding schedule. Follow your baby's cues and care plan; green does not mean delay feeding.")}</p>
    <p>{tr("Green: below 80% · Yellow: 80–100% · Red: at or above the median. Day and night records are compared separately (19:00–07:00).")}</p>
  </div>;
}
