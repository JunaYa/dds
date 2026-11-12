import { Button } from "@vita/ui/button";
import { type RecordType } from "../../domain/model";
import { useApp } from "../../hooks/useApp";
import { useI18n } from "../../i18n/useI18n";
import { typeName } from "../../i18n/record-labels";
import { RecordTypeIcon } from "./RecordTypeIcon";

export function RecordTypeChoices({ onPick }: { onPick?: (type: RecordType) => void }) {
  const { tr } = useI18n();
  const { types, openRecord } = useApp();
  return <div className="focus-types">
    {types.map(type => (
      <Button unstyled key={type.id} onClick={() => (onPick ?? openRecord)(type)}>
        <RecordTypeIcon type={type} />
        <span>{typeName(type, tr)}</span>
      </Button>
    ))}
  </div>;
}
