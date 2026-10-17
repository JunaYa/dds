import { useApp } from "../hooks/useApp";
import { useI18n } from "../i18n/useI18n";
import { typeName } from "../i18n/record-labels";

export function Analysis() {
  const { childRecords, types, day } = useApp();
  const { tr, locale } = useI18n();
  const start = new Date(`${day}T12:00:00`);
  start.setDate(start.getDate() - 6);
  const startDay = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const recent = childRecords.filter(record => {
    const date = record.time.slice(0, 10);
    return date >= startDay && date <= day;
  });
  const recordedDays = new Set(recent.map(record => record.time.slice(0, 10))).size;
  return (
    <section className="analysis-page" aria-labelledby="analysis-period">
      <h2 id="analysis-period">{tr("Last 7 days")}</h2>
      <p className="analysis-period">{start.toLocaleDateString(locale)} – {new Date(`${day}T12:00:00`).toLocaleDateString(locale)}</p>
      <dl className="analysis-summary">
        <div><dt>{tr("Records")}</dt><dd>{recent.length}</dd></div>
        <div><dt>{tr("Days recorded")}</dt><dd>{recordedDays}<span> / 7</span></dd></div>
      </dl>
      {recent.length === 0 ? (
        <p className="analysis-empty">{tr("Add care records on Home to see your baby's daily patterns here.")}</p>
      ) : (
        <section className="analysis-breakdown" aria-labelledby="analysis-types">
          <h3 id="analysis-types">{tr("Records by type")}</h3>
          <dl>{types.map(type => {
            const count = recent.filter(record => record.type === type.id).length;
            return <div key={type.id}><dt>{typeName(type, tr)}</dt><dd>{count}</dd></div>;
          })}</dl>
        </section>
      )}
      <p className="analysis-note">{tr("Counts reflect saved entries for the selected child, not care recommendations.")}</p>
    </section>
  );
}
