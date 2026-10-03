import { useI18n } from "../../i18n/useI18n";
import { useEffect, useState } from "react";
import { Button } from "@vita/ui/button";
import { useApp } from "../../hooks/useApp";
import { Icon } from "../common/Icon";
import { RecordRow } from "./RecordRow";

export function Log({
  title = "Records",
  compact = false,
}: {
  title?: string;
  compact?: boolean;
}) {
  const { tr, locale } = useI18n();
  const a = useApp();
  const [limit, setLimit] = useState(12);
  useEffect(() => setLimit(12), [a.child, a.range, a.query]);
  const groups = new Map<string, typeof a.visible>();
  for (const record of a.visible.slice(0, limit)) {
    const date = record.time.slice(0, 10);
    const group = groups.get(date) || [];
    group.push(record);
    groups.set(date, group);
  }
  return (
    <section className={`log ${compact ? "compact" : ""}`}>
      <div className="section-heading">
        <h2>{tr(title)}</h2>
        <span>
          {a.visible.length === 1
            ? tr("1 record")
            : tr("{count} records", { count: a.visible.length })}
        </span>
      </div>
      {!a.visible.length && (
        <div className="empty">
          <Icon name="book" size={32} />
          <h3>{tr("A little space for the next thing.")}</h3>
          <p>
            {a.query
              ? tr("Try another search or add a new moment.")
              : tr(
                  "Feeding, sleep, changes — your child’s moments will appear here.",
                )}
          </p>
          <Button onClick={() => a.openRecord(a.types[0])}>
            {tr("Add a record")}
          </Button>
        </div>
      )}
      <div className="record-timeline">
        {Array.from(groups, ([date, records]) => (
          <section className="timeline-day" key={date} aria-label={date}>
            <h3 className="timeline-date">
              <time dateTime={date}>
                {new Date(`${date}T12:00`).toLocaleDateString(locale, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>
                {records.length === 1
                  ? tr("1 record")
                  : tr("{count} records", { count: records.length })}
              </span>
            </h3>
            {records.map((record) => (
              <RecordRow key={record.id} record={record} />
            ))}
          </section>
        ))}
      </div>
      {a.visible.length > limit && (
        <Button
          unstyled
          className="load-more"
          onClick={() => setLimit((n) => n + 12)}
        >
          {tr("Show 12 more records")}
        </Button>
      )}
    </section>
  );
}
