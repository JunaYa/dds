import { Button } from "@vita/ui/button";
import { type RecordType } from "../../domain/model";
import { useApp } from "../../hooks/useApp";
import { useI18n } from "../../i18n/useI18n";
import { typeName } from "../../i18n/record-labels";
import { Icon } from "../common/Icon";

export function RecordTypeChoices({ onPick }: { onPick?: (type: RecordType) => void }) {
  const { tr } = useI18n();
  const { types, openRecord } = useApp();
  return <div className="focus-types">
    {types.map(type => (
      <Button unstyled key={type.id} onClick={() => (onPick ?? openRecord)(type)}>
        <Icon name={type.icon} />
        <span>{typeName(type, tr)}</span>
      </Button>
    ))}
  </div>;
}
