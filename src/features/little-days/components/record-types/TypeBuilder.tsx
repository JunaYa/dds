import { useState } from "react";
import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
import { useApp } from "../../hooks/useApp";
import { field, kinds, type Field, type Values } from "../../domain/model";
import { Fields } from "../records/Fields";

export function TypeBuilder() {
  const a = useApp(),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [fields, setFields] = useState([field("measure", "Amount", "mL")]),
    [preview, setPreview] = useState<Values>({});
  const update = (id: string, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const move = (i: number, j: number) =>
    setFields((fs) => {
      const copy = [...fs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && fields.length)
          a.saveType({
            name: name.trim(),
            description: description.trim() || "A routine, your way.",
            fields: fields.map((f) => ({
              ...f,
              label: f.label.trim(),
              unit: f.unit.trim(),
            })),
          });
      }}
    >
      <div className="record-fields">
        <label className="form-field">
          Record name
          <Input
            nativeInput
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Outdoor play"
          />
        </label>
        <label className="form-field">
          Short description
          <Input
            nativeInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What would you like to remember?"
          />
        </label>
      </div>
      <div className="builder-bank">
        <span className="tiny-title">ADD A BUILDING BLOCK</span>
        <div>
          {Object.entries(kinds).map(([kind, label]) => (
            <button
              type="button"
              key={kind}
              onClick={() =>
                setFields((fs) => [
                  ...fs,
                  field(
                    kind as Field["kind"],
                    label,
                    kind === "timer" ? "min" : kind === "count" ? "times" : "",
                    kind === "choice" ? "Option one, Option two" : "",
                  ),
                ])
              }
            >
              ＋ {label}
            </button>
          ))}
        </div>
      </div>
      <div className="builder-fields">
        {fields.map((f, i) => (
          <section key={f.id} className="builder-field">
            <div className="builder-field-head">
              <strong>
                {String(i + 1).padStart(2, "0")} / {kinds[f.kind]}
              </strong>
              <div>
                <button
                  type="button"
                  aria-label={`Move ${f.label} up`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${f.label} down`}
                  disabled={i === fields.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${f.label}`}
                  onClick={() =>
                    setFields((fs) => fs.filter((x) => x.id !== f.id))
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <div className="record-fields">
              <label className="form-field">
                Field label
                <input
                  required
                  value={f.label}
                  onChange={(e) => update(f.id, { label: e.target.value })}
                />
              </label>
              {["count", "measure"].includes(f.kind) && (
                <label className="form-field">
                  Unit
                  <input
                    value={f.unit}
                    onChange={(e) => update(f.id, { unit: e.target.value })}
                    placeholder="mL, kg, pieces…"
                  />
                </label>
              )}
              {f.kind === "choice" && (
                <label className="form-field">
                  Options, separated by commas
                  <input
                    required
                    value={f.options}
                    onChange={(e) => update(f.id, { options: e.target.value })}
                  />
                </label>
              )}
            </div>
          </section>
        ))}
      </div>
      <section className="builder-preview">
        <div className="section-heading">
          <h3>{name || "Your new record"}</h3>
          <span>Live form preview</span>
        </div>
        <Fields
          fields={fields}
          values={preview}
          onChange={(id, v) => setPreview((p) => ({ ...p, [id]: v }))}
        />
        {!fields.length && <p>Add at least one building block.</p>}
      </section>
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={() => a.setModal(null)}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="primary"
          disabled={
            !name.trim() ||
            !fields.length ||
            fields.some(
              (f) =>
                !f.label.trim() ||
                (f.kind === "choice" &&
                  !f.options.split(",").some((v) => v.trim())),
            )
          }
        >
          Create record type
        </Button>
      </div>
    </form>
  );
}
