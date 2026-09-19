import { type Field, type Values } from "../../domain/model";

export function Fields({
  fields,
  values,
  onChange,
}: {
  fields: Field[];
  values: Values;
  onChange: (id: string, value: string | number) => void;
}) {
  return (
    <div className="record-fields">
      {fields.map((f) => (
        <label
          className={`form-field ${f.kind === "text" ? "wide" : ""}`}
          key={f.id}
        >
          <span>
            {f.label}
            {f.unit && <small>{f.unit}</small>}
          </span>
          {f.kind === "choice" ? (
            <select
              value={values[f.id] ?? ""}
              onChange={(e) => onChange(f.id, e.target.value)}
            >
              <option value="">Choose…</option>
              {f.options
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((o) => (
                  <option key={o}>{o}</option>
                ))}
            </select>
          ) : f.kind === "text" ? (
            <textarea
              rows={2}
              value={values[f.id] ?? ""}
              onChange={(e) => onChange(f.id, e.target.value)}
            />
          ) : f.kind === "count" ? (
            <span className="count-input">
              <button
                type="button"
                aria-label={`Decrease ${f.label}`}
                disabled={!Number(values[f.id])}
                onClick={() =>
                  onChange(f.id, Math.max(0, Number(values[f.id] || 0) - 1))
                }
              >
                −
              </button>
              <input
                aria-label={f.label}
                type="number"
                min="0"
                step="1"
                value={values[f.id] ?? 0}
                onChange={(e) =>
                  onChange(
                    f.id,
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
              <button
                type="button"
                aria-label={`Increase ${f.label}`}
                onClick={() => onChange(f.id, Number(values[f.id] || 0) + 1)}
              >
                ＋
              </button>
            </span>
          ) : (
            <input
              type={f.kind === "date" ? "date" : "number"}
              min={f.kind === "date" ? undefined : 0}
              step={f.kind === "date" ? undefined : "any"}
              value={values[f.id] ?? ""}
              onChange={(e) =>
                onChange(
                  f.id,
                  f.kind === "date" || e.target.value === ""
                    ? e.target.value
                    : Number(e.target.value),
                )
              }
            />
          )}
        </label>
      ))}
    </div>
  );
}
