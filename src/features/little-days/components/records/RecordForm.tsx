import { DateTimePicker } from "@vita/ui/date-time-picker";
import { NativeSelect } from "@vita/ui/select";
import { Textarea } from "@vita/ui/textarea";
import { typeName } from "../../i18n/record-labels";
import { useI18n } from "../../i18n/useI18n";
import { useId, useState } from "react";
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
import { GrowthFields } from "./GrowthFields";

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
  const { tr, locale } = useI18n();
  const dateInputId = useId();
  const a = useApp(),
    [typeId, setTypeId] = useState(initialType.id),
    [values, setValues] = useState<Values>(record?.values || {}),
    [time, setTime] = useState(record?.time || localDateTime()),
    [note, setNote] = useState(record?.note || "");
  const type = a.types.find((t) => t.id === typeId) || initialType;
  const isGrowth =
    type.id === "growth" &&
    ["height", "weight"].every((id) =>
      type.fields.some(
        (field) =>
          field.id === id &&
          field.kind === "measure" &&
          field.unit === (id === "height" ? "cm" : "kg"),
      ),
    );
  const measurements = [values.height, values.weight].filter(
    (value) => value !== undefined && value !== "",
  );
  const hasMeasurement =
    measurements.length > 0 &&
    measurements.every(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value > 0,
    );
  return (
    <form
      className="record-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (isGrowth && !hasMeasurement) return;
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
            <strong>{tr("Nursing timer")}</strong>
            <span>
              {tr("Track each side separately. Pause or switch at any time.")}
            </span>
          </div>
          <Button
            variant="primary-muted"
            type="button"
            disabled={!!a.session}
            onClick={() => {
              if (a.startSession(type, true, child)) a.setModal(null);
            }}
          >
            {tr("Start nursing")}
          </Button>
        </div>
      )}
      {record?.nursing && (
        <dl className="nursing-record-details">
          <div>
            <dt>{tr("Start")}</dt>
            <dd>{new Date(record.nursing.startedAt).toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{tr("End")}</dt>
            <dd>{new Date(record.nursing.endedAt).toLocaleString(locale)}</dd>
          </div>
          <div>
            <dt>{tr("Left")}</dt>
            <dd>{formatNursingTime(record.nursing.leftSeconds)}</dd>
          </div>
          <div>
            <dt>{tr("Right")}</dt>
            <dd>{formatNursingTime(record.nursing.rightSeconds)}</dd>
          </div>
        </dl>
      )}
      {isGrowth && (
        <GrowthFields
          values={values}
          onChange={(id, value) =>
            setValues((previous) => ({ ...previous, [id]: value }))
          }
        />
      )}
      {!record && !inline && (
        <label className="form-field">
          {tr("Record type")}
          <NativeSelect
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setValues({});
            }}
          >
            {a.types.map((t) => (
              <option key={t.id} value={t.id}>
                {typeName(t, tr)}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      <div className="form-field">
        <label htmlFor={dateInputId}>{tr("When")}</label>
        <DateTimePicker
          id={dateInputId}
          locale={locale}
          required

          value={time}
          onValueChange={setTime}
        />
      </div>
      <Fields
        recordType={type}
        fields={
          isGrowth
            ? type.fields.filter(
                (field) => !["height", "weight"].includes(field.id),
              )
            : type.fields
        }
        values={values}
        onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
      />
      <label className="form-field">
        {tr("Caregiver note")}
        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={tr("Anything you’d like to remember")}
        />
      </label>
      {type.fields.some((f) => f.kind === "timer") && !record && (
        <div className="timer-option">
          <p>{tr("Happening right now?")}</p>
          <Button
            unstyled
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
            {tr("Start live {name} timer", {
              name: typeName(type, tr).toLowerCase(),
            })}
          </Button>
          <small>
            {tr(
              "Live mode records the first timer field; other details can be added afterward.",
            )}
          </small>
        </div>
      )}
      <div className="form-actions">
        {record ? (
          <Button
            unstyled
            className="delete-record"
            type="button"
            onClick={() => {
              if (a.removeRecord(record.id)) a.setModal(null);
            }}
          >
            {tr("Delete record")}
          </Button>
        ) : (
          !inline && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => a.setModal(null)}
            >
              {tr("Cancel")}
            </Button>
          )
        )}
        <Button
          type="submit"
          className="primary"
          disabled={isGrowth && !hasMeasurement}
        >
          {record ? tr("Save changes") : tr("Save record")}
        </Button>
      </div>
    </form>
  );
}
