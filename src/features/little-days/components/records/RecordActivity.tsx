import { useId, useState } from "react";
import { Button } from "@vita/ui/button";
import type { CareRecord } from "../../domain/model";
import { useI18n } from "../../i18n/useI18n";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function RecordActivity({ records, day }: { records: CareRecord[]; day: string }) {
  const { tr, locale } = useI18n();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const end = new Date(`${day}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - 89);
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = record.time.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const offset = (start.getDay() + 6) % 7;
  const days = Array.from({ length: 90 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const key = dateKey(date);
    const count = counts.get(key) ?? 0;
    return { date, key, count, level: count === 0 ? 0 : count <= 3 ? 1 : count <= 7 ? 2 : count <= 11 ? 3 : 4 };
  });
  const total = days.reduce((sum, item) => sum + item.count, 0);
  const columns = Math.ceil((offset + days.length) / 7);
  const description = tr("Records saved in the last 90 days: {count}.", { count: total });
  const formatDate = (date: Date) => date.toLocaleDateString(locale, { dateStyle: "medium" });

  return (
    <section className="record-activity" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{tr("Record activity")}</h2>
      <p className="record-activity-summary">{description}</p>
      <svg className="record-activity-map" viewBox={`0 0 ${columns * 18} 150`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>{tr("Records by day")}</title>
        <desc id={`${id}-description`}>{description} {formatDate(start)} – {formatDate(end)}. {tr("Open daily details for exact counts.")}</desc>
        {days.map(({ date, key, count, level }, index) => {
          const x = Math.floor((offset + index) / 7) * 18;
          const y = 20 + ((offset + index) % 7) * 18;
          return <g key={key}>
            {(index === 0 || (date.getDate() === 1 && Math.floor((offset + index) / 7) > 0)) && (
              <text x={x} y="11" className="activity-label">{date.toLocaleDateString(locale, { month: "short" })}</text>
            )}
            <rect x={x} y={y} width="14" height="14" rx="2" data-level={level}>
              <title>{formatDate(date)}: {tr("{count} records", { count })}</title>
            </rect>
          </g>;
        })}
      </svg>
      <div className="record-activity-footer">
        <span>{formatDate(start)} – {formatDate(end)}</span>
        <div className="record-activity-legend" aria-label={tr("Records per day")}>
          {["0", "1–3", "4–7", "8–11", "12+"].map((label, level) => <span key={level}><i data-level={level} aria-hidden="true" />{label}</span>)}
        </div>
      </div>
      <p className="record-activity-note">{tr("Blank days mean no saved records, not no care activity.")}</p>
      <Button variant="ghost" aria-expanded={expanded} aria-controls={`${id}-details`} onClick={() => setExpanded(!expanded)}>
        {tr(expanded ? "Hide daily details" : "Show daily details")}
      </Button>
      <div id={`${id}-details`} hidden={!expanded} className="record-activity-details">
        {expanded && <table>
          <caption className="sr-only">{tr("Records by day")}</caption>
          <thead><tr><th scope="col">{tr("Date")}</th><th scope="col">{tr("Records")}</th></tr></thead>
          <tbody>{[...days].reverse().map(({ date, key, count }) => <tr key={key}><th scope="row">{formatDate(date)}</th><td>{count}</td></tr>)}</tbody>
        </table>}
      </div>
    </section>
  );
}
