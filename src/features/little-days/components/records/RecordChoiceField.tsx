import { useId } from "react";
import { NativeInput } from "@vita/ui/input";
import { type Field, type RecordType } from "../../domain/model";
import { fieldLabel, isBuiltinField } from "../../i18n/record-labels";
import { useI18n } from "../../i18n/useI18n";

export function RecordChoiceField({
  field,
  recordType,
  value,
  onChange,
  required = false,
  columns = 2,
}: {
  required?: boolean;
  columns?: 2 | 3;
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
    <fieldset className="record-choice-field wide">
      <legend>{fieldLabel(recordType, field, tr)}</legend>
      <div className="record-choice-options" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <label className="record-choice-option" key={option}>
            <NativeInput
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              required={required}
              onChange={() => onChange(option)}
            />
            <span>{isBuiltinField(recordType, field) ? tr(option) : option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
