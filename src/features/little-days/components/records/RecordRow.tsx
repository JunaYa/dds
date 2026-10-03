import { typeName } from "../../i18n/record-labels";
import { useI18n } from "../../i18n/useI18n";
import { useApp } from "../../hooks/useApp";
import { summary, type CareRecord } from "../../domain/model";
import { Icon } from "../common/Icon";

export function RecordRow({ record }: { record: CareRecord }) {
  const { tr } = useI18n();
  const a = useApp(),
    type = a.types.find((t) => t.id === record.type);
  if (!type) return null;
  return (
    <article className="record">
      <time dateTime={record.time}>{record.time.slice(11, 16)}</time>
      <span className={`record-dot ${type.id}`}>
        <Icon name={type.icon} size={19} />
      </span>
      <button
        className="record-content"
        onClick={() => a.openRecord(type, record)}
      >
        <strong>{typeName(type, tr)}</strong>
        <span>{summary(record, type, tr)}</span>
        {record.note && <p>{record.note}</p>}
      </button>
      <button
        className="record-edit"
        aria-label={tr("Edit {name} at {time}", {
          name: typeName(type, tr),
          time: record.time.slice(11, 16),
        })}
        onClick={() => a.openRecord(type, record)}
      >
        ↗
      </button>
    </article>
  );
}
