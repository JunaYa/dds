import { defaultTypes, type RecordType, type Field } from "../domain/model";
import type { Translate } from "./translate";
const builtins = defaultTypes();
export function typeName(type: RecordType, tr: Translate) {
  const original = builtins.find((item) => item.id === type.id);
  return original?.name === type.name ? tr(type.name) : type.name;
}
export function typeDescription(type: RecordType, tr: Translate) {
  const original = builtins.find((item) => item.id === type.id);
  return original?.description === type.description
    ? tr(type.description)
    : type.description;
}
export function isBuiltinField(type: RecordType | undefined, field: Field) {
  const original = builtins
    .find((item) => item.id === type?.id)
    ?.fields.find((item) => item.id === field.id);
  return (
    !!original &&
    original.kind === field.kind &&
    original.label === field.label &&
    original.unit === field.unit &&
    original.options === field.options
  );
}
export function fieldLabel(
  type: RecordType | undefined,
  field: Field,
  tr: Translate,
) {
  return isBuiltinField(type, field) ? tr(field.label) : field.label;
}
