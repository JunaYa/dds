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
          <p>No records match this view.</p>
          <Button onClick={() => a.openRecord(a.types[0])}>Add a record</Button>
        </div>
      )}
      {a.visible.slice(0, limit).map((record) => (
        <RecordRow key={record.id} record={record} />
      ))}
      {a.visible.length > limit && (
        <button className="load-more" onClick={() => setLimit((n) => n + 12)}>
          Show 12 more records
        </button>
      )}
    </section>
  );
}
