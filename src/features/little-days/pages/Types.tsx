import { useApp } from "../hooks/useApp";
import { Icon } from "../components/common/Icon";

export function Types() {
  const a = useApp();
  return (
    <div className="type-grid">
      {a.types.map((type) => (
        <article className="type-card" key={type.id}>
          <span className={`icon-well ${type.id}`}>
            <Icon name={type.icon} />
          </span>
          <h2>{type.name}</h2>
          <p>{type.description}</p>
          <div className="field-tags">
            {type.fields.map((f) => (
              <span key={f.id}>
                {f.label}
                {f.unit ? ` · ${f.unit}` : ""}
              </span>
            ))}
          </div>
          <button onClick={() => a.openRecord(type)}>
            Use this record type ↗
          </button>
        </article>
      ))}
    </div>
  );
}
