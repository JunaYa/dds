import { useId } from "react";
import { NativeInput } from "@vita/ui/input";
import { type Field, type RecordType } from "../../domain/model";
import { fieldLabel, isBuiltinField } from "../../i18n/record-labels";
import { useI18n } from "../../i18n/useI18n";

export function DiaperTypeField({
  field,
  recordType,
  value,
  onChange,
}: {
  field: Field;
  recordType: RecordType;
  value: string | number | undefined;
  onChange: (value: string) => void;
}) {
  const name = useId();
  const { tr } = useI18n();
  const options = [
    ...new Set(field.options.split(",").map((o) => o.trim()).filter(Boolean)),
  ];
  return (
    <fieldset className="diaper-type-field wide">
      <legend>{fieldLabel(recordType, field, tr)}</legend>
      <div className="diaper-type-options">
        {options.map((option) => (
          <label className="diaper-type-option" key={option}>
            <NativeInput
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              required
              onChange={() => onChange(option)}
            />
            <span>{isBuiltinField(recordType, field) ? tr(option) : option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
