import { useApp } from "../../hooks/useApp";
import { summary, type CareRecord } from "../../domain/model";
import { Icon } from "../common/Icon";

export function RecordRow({ record }: { record: CareRecord }) {
  const a = useApp(),
    type = a.types.find((t) => t.id === record.type);
  if (!type) return null;
  return (
    <article className="record">
      <time dateTime={record.time}>
        {record.time.slice(11, 16)}
        {a.range === "all" && <small>{record.time.slice(0, 10)}</small>}
      </time>
      <span className={`record-dot ${type.id}`}>
        <Icon name={type.icon} size={19} />
      </span>
      <button
        className="record-content"
        onClick={() => a.openRecord(type, record)}
      >
        <strong>{type.name}</strong>
        <span>{summary(record, type)}</span>
        {record.note && <p>{record.note}</p>}
      </button>
      <button
        className="record-edit"
        aria-label={`Edit ${type.name} at ${record.time.slice(11, 16)}`}
        onClick={() => a.openRecord(type, record)}
      >
        ↗
      </button>
    </article>
  );
}
