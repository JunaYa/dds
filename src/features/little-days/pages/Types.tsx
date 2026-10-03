import { Button } from "@vita/ui/button";
import {
  typeName,
  typeDescription,
  fieldLabel,
  isBuiltinField,
} from "../i18n/record-labels";
import { useI18n } from "../i18n/useI18n";
import { useApp } from "../hooks/useApp";
import { Icon } from "../components/common/Icon";

export function Types() {
  const { tr } = useI18n();
  const a = useApp();
  return (
    <div className="type-grid">
      {a.types.map((type) => (
        <article className="type-card" key={type.id}>
          <span className={`icon-well ${type.id}`}>
            <Icon name={type.icon} />
          </span>
          <h2>{typeName(type, tr)}</h2>
          <p>{typeDescription(type, tr)}</p>
          <div className="field-tags">
            {type.fields.map((f) => (
              <span key={f.id}>
                {fieldLabel(type, f, tr)}
                {f.unit
                  ? ` · ${isBuiltinField(type, f) ? tr(f.unit) : f.unit}`
                  : ""}
              </span>
            ))}
          </div>
          <Button unstyled onClick={() => a.openRecord(type)}>
            {tr("Use this record type ↗")}
          </Button>
        </article>
      ))}
    </div>
  );
}
