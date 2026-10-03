import { DateTimePicker } from "@vita/ui/date-time-picker";
import { useId } from "react";
import { Button } from "@vita/ui/button";
import { NativeSelect } from "@vita/ui/select";
import { Textarea } from "@vita/ui/textarea";
import { Input } from "@vita/ui/input";
import { fieldLabel, isBuiltinField } from "../../i18n/record-labels";
import { useI18n } from "../../i18n/useI18n";
import { type Field, type Values, type RecordType } from "../../domain/model";

export function Fields({
  fields,
  recordType,
  values,
  onChange,
}: {
  fields: Field[];
  recordType?: RecordType;
  values: Values;
  onChange: (id: string, value: string | number) => void;
}) {
  const { tr, locale } = useI18n();
  const prefix = useId();
  return (
    <div className="record-fields">
      {fields.map((f) => (
        <div
          className={`form-field ${f.kind === "text" ? "wide" : ""}`}
          key={f.id}
        >
          <label htmlFor={`${prefix}-${f.id}`}>
            {fieldLabel(recordType, f, tr)}
            {f.unit && (
              <small>
                {isBuiltinField(recordType, f) ? tr(f.unit) : f.unit}
              </small>
            )}
          </label>
          {f.kind === "choice" ? (
            <NativeSelect
              id={`${prefix}-${f.id}`}
              value={values[f.id] ?? ""}
              onChange={(e) => onChange(f.id, e.target.value)}
            >
              <option value="">{tr("Choose…")}</option>
              {f.options
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((o) => (
                  <option key={o} value={o}>
                    {isBuiltinField(recordType, f) ? tr(o) : o}
                  </option>
                ))}
            </NativeSelect>
          ) : f.kind === "text" ? (
            <Textarea
              id={`${prefix}-${f.id}`}
              rows={2}
              value={values[f.id] ?? ""}
              onChange={(e) => onChange(f.id, e.target.value)}
            />
          ) : f.kind === "count" ? (
            <span className="count-input">
              <Button
                unstyled
                type="button"
                aria-label={tr("Decrease {label}", {
                  label: fieldLabel(recordType, f, tr),
                })}
                disabled={!Number(values[f.id])}
                onClick={() =>
                  onChange(f.id, Math.max(0, Number(values[f.id] || 0) - 1))
                }
              >
                −
              </Button>
              <Input
                nativeInput
                id={`${prefix}-${f.id}`}
                aria-label={fieldLabel(recordType, f, tr)}
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
              <Button
                unstyled
                type="button"
                aria-label={tr("Increase {label}", {
                  label: fieldLabel(recordType, f, tr),
                })}
                onClick={() => onChange(f.id, Number(values[f.id] || 0) + 1)}
              >
                ＋
              </Button>
            </span>
          ) : f.kind === "date" ? (
            <DateTimePicker
              id={`${prefix}-${f.id}`}
              mode="date"
              locale={locale}
              value={String(values[f.id] ?? "")}
              onValueChange={(value) => onChange(f.id, value)}
            />
          ) : (
            <Input
              nativeInput
              id={`${prefix}-${f.id}`}
              type="number"
              min={0}
              step="any"
              value={values[f.id] ?? ""}
              onChange={(e) =>
                onChange(
                  f.id,
                  e.target.value === ""
                    ? e.target.value
                    : Number(e.target.value),
                )
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
