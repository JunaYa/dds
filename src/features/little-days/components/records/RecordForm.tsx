import { useState } from "react";
import { Button } from "@vita/ui/button";
import { useApp } from "../../hooks/useApp";
import { NursingSymbol } from "../nursing/NursingSymbol";
import { formatNursingTime } from "../../domain/nursing";
import {
  localDateTime,
  type Values,
  type RecordType,
  type CareRecord,
} from "../../domain/model";
import { Fields } from "./Fields";

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
