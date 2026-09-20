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
        <h2>{title}</h2>
        <span>{a.visible.length} records</span>
      </div>
      {!a.visible.length && (
        <div className="empty">
          <Icon name="book" size={32} />
          <h3>A little space for the next thing.</h3>
          <p>{a.query ? "Try another search or add a new moment." : "Feeding, sleep, changes — your child’s moments will appear here."}</p>
          <Button onClick={() => a.openRecord(a.types[0])}>Add a record</Button>
        </div>
      )}
      <div className="record-timeline">
        {Array.from(groups, ([date, records]) => (
          <section className="timeline-day" key={date} aria-label={date}>
            <h3 className="timeline-date">
              <time dateTime={date}>{new Date(`${date}T12:00`).toLocaleDateString(undefined, {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}</time>
              <span>{records.length} records</span>
            </h3>
            {records.map((record) => <RecordRow key={record.id} record={record} />)}
          </section>
        ))}
      </div>
      {a.visible.length > limit && (
        <button className="load-more" onClick={() => setLimit((n) => n + 12)}>
          Show 12 more records
        </button>
      )}
    </section>
  );
}
