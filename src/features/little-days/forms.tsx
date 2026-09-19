import { useState } from "react";
import { Button } from "@vita/ui/button";
import { Input } from "@vita/ui/input";
import { useApp } from "./store";
import { NursingSymbol } from "./NursingSymbol";
import { formatNursingTime } from "./nursing";
import {
  field,
  kinds,
  localDateTime,
  today,
  type Field,
  type Values,
  type RecordType,
  type CareRecord,
  type Supply,
} from "./model";
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
export function RecordForm({
  type: initialType,
  record,
  child,
  inline = false,
}: {
  type: RecordType;
  record?: CareRecord | null;
  child: string;
  inline?: boolean;
}) {
  const a = useApp(),
    [typeId, setTypeId] = useState(initialType.id),
    [values, setValues] = useState<Values>(record?.values || {}),
    [time, setTime] = useState(record?.time || localDateTime()),
    [note, setNote] = useState(record?.note || "");
  const type = a.types.find((t) => t.id === typeId) || initialType;
  return (
    <form
      className="record-form"
      onSubmit={(e) => {
        e.preventDefault();
        const saved = a.saveRecord({
          id: record?.id,
          child,
          type: type.id,
          values: { ...values },
          time,
          note,
          nursing: record?.nursing,
        });
        if (saved && inline) {
          setValues({});
          setNote("");
          setTime(localDateTime());
        }
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
    >
      {type.id === "feed" && !record && (
        <div className="nursing-entry">
          <NursingSymbol />
          <div>
            <strong>亲喂计时</strong>
            <span>左右侧分别记录，随时暂停或切换</span>
          </div>
          <Button
            variant="primary-muted"
            type="button"
            disabled={!!a.session}
            onClick={() => {
              if (a.startSession(type, true, child)) a.setModal(null);
            }}
          >
            开始亲喂
          </Button>
        </div>
      )}
      {record?.nursing && (
        <dl className="nursing-record-details">
          <div>
            <dt>开始</dt>
            <dd>{new Date(record.nursing.startedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>结束</dt>
            <dd>{new Date(record.nursing.endedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>左侧</dt>
            <dd>{formatNursingTime(record.nursing.leftSeconds)}</dd>
          </div>
          <div>
            <dt>右侧</dt>
            <dd>{formatNursingTime(record.nursing.rightSeconds)}</dd>
          </div>
        </dl>
      )}
      {!record && !inline && (
        <label className="form-field">
          Record type
          <select
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setValues({});
            }}
          >
            {a.types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="form-field">
        When
        <input
          required
          type="datetime-local"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>
      <Fields
        fields={type.fields}
        values={values}
        onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
      />
      <label className="form-field">
        Caregiver note
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything you’d like to remember"
        />
      </label>
      {type.fields.some((f) => f.kind === "timer") && !record && (
        <div className="timer-option">
          <p>Happening right now?</p>
          <button
            type="button"
            disabled={!!a.session}
            onClick={() => {
              if (
                a.startSession(
                  type,
                  type.id === "feed" && values.method === "Nursing",
                  child,
                )
              )
                a.setModal(null);
            }}
          >
            Start live {type.name.toLowerCase()} timer
          </button>
          <small>
            Live mode records the first timer field; other details can be added
            afterward.
          </small>
        </div>
      )}
      <div className="form-actions">
        {record ? (
          <button
            className="delete-record"
            type="button"
            onClick={() => {
              if (a.removeRecord(record.id)) a.setModal(null);
            }}
          >
            Delete record
          </button>
        ) : (
          !inline && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => a.setModal(null)}
            >
              Cancel
            </Button>
          )
        )}
        <Button type="submit" className="primary">
          {record ? "Save changes" : "Save record"}
        </Button>
      </div>
    </form>
  );
}
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
export function SupplyForm({ supply }: { supply?: Supply }) {
  const a = useApp(),
    [name, setName] = useState(""),
    [unit, setUnit] = useState("pieces"),
    [stock, setStock] = useState<number | string>(0),
    [low, setLow] = useState<number | string>(5),
    [amount, setAmount] = useState<number | string>(1);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (supply) {
          if (a.stockChange(supply.id, Number(amount))) a.setModal(null);
        } else
          a.addSupply({
            name: name.trim(),
            unit: unit.trim(),
            stock: Number(stock),
            low: Number(low),
          });
      }}
    >
      {supply ? (
        <>
          <h3 className="restock-name">{supply.name}</h3>
          <label className="form-field">
            How many {supply.unit} are you adding?
            <input
              required
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          <label className="form-field">
            Supply name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Diapers, vitamins, anything you keep…"
            />
          </label>
          <label className="form-field">
            Stock unit
            <input
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </label>
          <div className="record-fields">
            <label className="form-field">
              Quantity in stock
              <input
                required
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </label>
            <label className="form-field">
              Refill threshold
              <input
                required
                type="number"
                min="0"
                step="1"
                value={low}
                onChange={(e) => setLow(e.target.value)}
              />
            </label>
          </div>
        </>
      )}
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={() => a.setModal(null)}>
          Cancel
        </Button>
        <Button
          className="primary"
          type="submit"
          disabled={!supply && (!name.trim() || !unit.trim())}
        >
          {supply ? "Add stock" : "Save supply"}
        </Button>
      </div>
    </form>
  );
}

export function ChildForm() {
  const a = useApp(),
    [name, setName] = useState(""),
    [birthday, setBirthday] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        a.saveChild({ name: name.trim(), birthday });
      }}
    >
      <label className="form-field">
        Child’s name
        <input
          required
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="form-field">
        Birthday
        <input
          required
          type="date"
          max={today()}
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <Button
          type="submit"
          className="primary"
          disabled={!name.trim() || !birthday}
        >
          Add child
        </Button>
      </div>
    </form>
  );
}
